document.addEventListener('DOMContentLoaded', async () => {
    // --- Globale Elemente ---
    const vehicleTitleElement = document.getElementById('vehicle-title');
    const initialAnalysisContainer = document.getElementById('initial-analysis-container');
    const priceSectionContainer = document.getElementById('price-section-container');
    const headerActions = document.querySelector('.header-actions');
    
    // --- Header-Buttons & Theme Switch ---
    const themeSwitch = document.getElementById('theme-switch-checkbox');
    const headerCostsButton = document.getElementById('header-costs-button');
    const headerChatButton = document.getElementById('header-chat-button');
    const headerShareButton = document.getElementById('header-share-button');

    // --- Chat-Elemente ---
    const chatOverlay = document.getElementById('chat-overlay');
    const closeChatButton = document.getElementById('close-chat-button');
    const chatMessagesContainer = document.getElementById('chat-messages-container');
    const questionInput = document.getElementById('question-input');
    const sendButton = document.getElementById('send-button');

    // --- Kosten-Elemente ---
    const costsOverlay = document.getElementById('costs-overlay');
    const closeCostsButton = document.getElementById('close-costs-button');
    const costsFormContainer = document.getElementById('costs-form-container');
    const costsResultContainer = document.getElementById('costs-result-container');
    const calculateCostsButton = document.getElementById('calculate-costs-button');

    // --- Share-Elemente ---
    const shareOverlay = document.getElementById('share-overlay');
    const closeShareButton = document.getElementById('close-share-button');
    const copyTextButton = document.getElementById('copy-text-button');
    const shareStatus = document.getElementById('share-status');
    const hiddenShareTextarea = document.getElementById('hidden-share-textarea');

    // --- Globale Zustände ---
    let initialAnalysisData = null;
    let isWelcomeMessageShown = false;

    // --- 0. Theme-Management ---
    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        themeSwitch.checked = theme === 'light';
    }

    function toggleTheme() {
        const newTheme = themeSwitch.checked ? 'light' : 'dark';
        applyTheme(newTheme);
        chrome.storage.local.set({ theme: newTheme });
    }

    chrome.storage.local.get('theme', (data) => {
        const savedTheme = data.theme || 'dark'; // Standard auf dark
        applyTheme(savedTheme);
    });
    themeSwitch.addEventListener('change', toggleTheme);


    // --- 1. Laden der Erstanalyse ---
    try {
        const { currentAnalysis } = await chrome.storage.local.get('currentAnalysis');
        if (currentAnalysis && currentAnalysis.analysisData) {
            initialAnalysisData = currentAnalysis.analysisData;
            displayAnalysis(initialAnalysisData);
            chrome.storage.local.remove('currentAnalysis');
        } else {
            displayError({ message: "Analyse konnte nicht geladen werden oder ist fehlerhaft." });
        }
    } catch (e) {
        displayError({ message: "Ein unerwarteter Fehler ist aufgetreten." });
    }

    // Trigger animations after a short delay
    setTimeout(() => {
        document.body.classList.remove('loading');
    }, 100);

    function displayAnalysis(analysis) {
        if (analysis.error) {
            displayError(analysis.error);
            return;
        }

        vehicleTitleElement.textContent = analysis.vehicle_title || "Unbekanntes Fahrzeug";
        
        const priceEvaluationText = analysis.price_evaluation || "";
        const priceMatch = priceEvaluationText.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})?\s*€)/);
        const price = priceMatch ? priceMatch[0] : "N/A";

        let evaluationClass = '';
        let evaluationText = 'Unbewertet';

        if (priceEvaluationText.toLowerCase().includes('fair')) {
            evaluationClass = 'fair';
            evaluationText = 'Faires Angebot';
        } else if (priceEvaluationText.toLowerCase().includes('günstig')) {
            evaluationClass = 'good';
            evaluationText = 'Gutes Angebot';
        } else if (priceEvaluationText.toLowerCase().includes('teuer')) {
            evaluationClass = 'expensive';
            evaluationText = 'Eher teuer';
        }

        const reasoning = priceEvaluationText.replace(/.*?€\s*-\s*/, '');
        
        priceSectionContainer.innerHTML = `
            <div class="price-card">
                <p class="price-tag">${price}</p>
                <span class="price-evaluation ${evaluationClass}">${evaluationText}</span>
                <p class="price-reasoning">${reasoning}</p>
            </div>
        `;

        const icons = {
            equipment: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>`,
            advantages: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
            disadvantages: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
            red_flags: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 18 18"></path><path d="M10.5 10.5c.383-1.11.96-2.122 1.83-2.992"></path><path d="M15 12c0-2.5-2-5-5-5"></path><path d="M18.5 18.5c-2.3-2.3-5-4.5-8-4.5"></path><path d="M2 21c3-3 5.7-5 9-5"></path></svg>`,
            issues: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
        };

        const createSection = (title, content, className, icon) => {
            if (!content || (Array.isArray(content) && content.length === 0)) return '';
            const itemsHTML = Array.isArray(content) ? `<ul>${content.map(item => `<li>${item}</li>`).join('')}</ul>` : `<p>${content}</p>`;
            return `<div class="result-section ${className}"><h4>${icon}${title}</h4>${itemsHTML}</div>`;
        };

        const analysisHTML = `
            ${createSection('Top-Ausstattung', analysis.equipment_summary, 'equipment-section', icons.equipment)}
            ${createSection('Vorteile', analysis.advantages, 'advantages-section', icons.advantages)}
            ${createSection('Nachteile / Risiken', analysis.disadvantages, 'disadvantages-section', icons.disadvantages)}
            ${createSection('Rote Flaggen', analysis.red_flags, 'redflags-section', icons.red_flags)}
            ${createSection('Bekannte Modell-Probleme', analysis.model_specific_issues, 'issues-section', icons.issues)}
        `;
        
        initialAnalysisContainer.insertAdjacentHTML('beforeend', analysisHTML);
    }

    function displayError(error) {
        vehicleTitleElement.textContent = "Fehler";
        initialAnalysisContainer.innerHTML = `<div class="result-section error-section"><h4>Analyse fehlgeschlagen</h4><p>${error.message}</p></div>`;
        if (headerActions) {
            headerActions.style.display = 'none';
        }
    }

    // --- 2. Event-Listener für Header-Buttons & Overlays ---
    function setupOverlay(button, overlay) {
        button.addEventListener('click', () => overlay.classList.add('is-visible'));
        overlay.querySelector('.close-button').addEventListener('click', () => overlay.classList.remove('is-visible'));
        overlay.addEventListener('click', (e) => {
             if (e.target === overlay) {
                 overlay.classList.remove('is-visible');
             }
        });
    }
    
    setupOverlay(headerChatButton, chatOverlay);
    setupOverlay(headerCostsButton, costsOverlay);
    setupOverlay(headerShareButton, shareOverlay);

    headerChatButton.addEventListener('click', () => {
         if (!isWelcomeMessageShown) {
            isWelcomeMessageShown = true;
            showTypingIndicator(chatMessagesContainer);
            setTimeout(() => {
                hideTypingIndicator(chatMessagesContainer);
                appendMessage("Hallo! Ich bin dein digitaler KFZ-Meister. Wie kann ich dir weiterhelfen?", 'bot-message');
                questionInput.focus();
            }, 1500);
        } else {
            questionInput.focus();
        }
    });

    // --- 3. Logik für Folgefragen ---
    async function handleSendQuestion() {
        const question = questionInput.value.trim();
        if (!question || !initialAnalysisData) return;

        appendMessage(question, 'user-message');
        questionInput.value = '';
        sendButton.disabled = true;
        showTypingIndicator(chatMessagesContainer);

        const conversationHistory = [{ role: "model", parts: [{ text: `Erstanalyse: ${JSON.stringify(initialAnalysisData)}` }] }];
        chatMessagesContainer.querySelectorAll('.message').forEach(msg => {
            if (!msg.classList.contains('typing-indicator')) {
                const role = msg.classList.contains('user-message') ? 'user' : 'model';
                conversationHistory.push({ role: role, parts: [{ text: msg.innerText }] });
            }
        });

        const response = await chrome.runtime.sendMessage({ type: 'FOLLOW_UP_QUESTION', data: question, history: conversationHistory });
        
        hideTypingIndicator(chatMessagesContainer);
        if (response.error) {
            appendMessage(`Fehler: ${response.error.message}`, 'bot-message error');
        } else {
            appendMessage(response.answer, 'bot-message');
        }
        sendButton.disabled = false;
        questionInput.focus();
    }

    function appendMessage(text, className) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;
        messageDiv.innerHTML = text.replace(/\n/g, '<br>');
        chatMessagesContainer.appendChild(messageDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }
    
    // --- 4. Logik für Kosten-Overlay ---
    calculateCostsButton.addEventListener('click', async () => {
        const userInfo = {
            age: document.getElementById('age-input').value,
            sfClass: document.getElementById('sf-class-input').value,
            insuranceType: document.getElementById('insurance-type-select').value,
            location: document.getElementById('location-input').value,
        };

        if (!userInfo.age || !userInfo.sfClass || !userInfo.location) {
            alert("Bitte fülle alle Felder aus.");
            return;
        }

        costsFormContainer.style.display = 'none';
        costsResultContainer.style.display = 'block';
        costsResultContainer.innerHTML = '';
        
        const { progressInterval, progressBar, loadingWrapper } = showCostsProgressBar(costsResultContainer);

        const response = await chrome.runtime.sendMessage({
            type: 'CALCULATE_OWNERSHIP_COSTS',
            vehicleInfo: initialAnalysisData,
            userInfo: userInfo
        });

        const isError = !!response.error;

        hideCostsProgressBar(progressInterval, progressBar, isError, () => {
            loadingWrapper.remove();
            if (isError) {
                costsResultContainer.innerHTML = `<div class="result-section error-section"><h4>Berechnung fehlgeschlagen</h4><p>${response.error.message}</p></div>`;
            } else {
                displayCostResults(response.costs);
            }
        });
    });

    function displayCostResults(costs) {
        const createCostSection = (title, costItem) => {
            if (!costItem) return '';
            return `
                <div class="result-section costs-section">
                    <h4>${title}</h4>
                    <p><b>~ ${costItem.amount} € / Jahr</b></p>
                    <p style="font-size: 13px; color: var(--text-muted);">${costItem.details}</p>
                </div>
            `;
        };

        const costsHTML = `
            <div class="costs-summary">
                <h3>Geschätzte Gesamtkosten</h3>
                <p class="total-annual">${costs.total_annual_cost} € / Jahr</p>
                <p class="total-monthly">oder ca. ${costs.total_monthly_cost} € / Monat</p>
            </div>
            ${createCostSection('KFZ-Steuer', costs.vehicle_tax)}
            ${createCostSection('Versicherung', costs.insurance)}
            ${createCostSection('Wartung & Reparaturen', costs.maintenance)}
            ${createCostSection('Spritkosten', costs.fuel_costs)}
        `;
        costsResultContainer.innerHTML = costsHTML;
    }


    // --- 5. Logik für Teilen ---
    function generateShareText() {
        let textToShare = `*CarCheck AI für: ${vehicleTitleElement.textContent}*\n\n`;
        const priceCard = document.querySelector('.price-card');
        if (priceCard) {
            const price = priceCard.querySelector('.price-tag').innerText;
    //        const eval = priceCard.querySelector('.price-evaluation').innerText;
            const reason = priceCard.querySelector('.price-reasoning').innerText;
            textToShare += `*${price}* - ${eval}\n_${reason}_\n\n`;
        }
        
        const sections = initialAnalysisContainer.querySelectorAll('.result-section');
        sections.forEach(section => {
            const title = section.querySelector('h4').innerText.trim();
            textToShare += `*${title}*\n`;
            const content = section.querySelector('ul, p');
            if (content.tagName === 'P') {
                textToShare += content.innerText.trim() + '\n\n';
            } else {
                const items = content.querySelectorAll('li');
                items.forEach(item => { textToShare += `- ${item.innerText.trim()}\n`; });
                textToShare += '\n';
            }
        });
        const chatText = chatMessagesContainer.innerText;
        if (chatText && chatText.trim() !== '') {
            let formattedChat = '*--- Folgefragen --*\n';
            const messages = chatMessagesContainer.querySelectorAll('.message');
            messages.forEach(msg => {
                if (!msg.classList.contains('typing-indicator')) {
                    const prefix = msg.classList.contains('user-message') ? 'Du:' : 'Meister:';
                    formattedChat += `${prefix} ${msg.innerText.trim()}\n`;
                }
            });
            textToShare += formattedChat;
        }
        return textToShare;
    }

    copyTextButton.addEventListener('click', () => {
        const text = generateShareText();
        hiddenShareTextarea.value = text;
        hiddenShareTextarea.select();
        try {
            document.execCommand('copy');
            shareStatus.textContent = 'Erfolgreich kopiert!';
            setTimeout(() => { shareStatus.textContent = ''; }, 2000);
        } catch (err) {
            shareStatus.textContent = 'Kopieren fehlgeschlagen.';
            shareStatus.style.color = 'var(--accent-red)';
        }
    });


    // --- 6. Hilfsfunktionen für Animationen ---
    function showTypingIndicator(container) {
        const indicator = document.createElement('div');
        indicator.className = 'message bot-message typing-indicator';
        indicator.innerHTML = `<span></span><span></span><span></span>`;
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
    }

    function hideTypingIndicator(container) {
        const indicator = container.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    }

    function showCostsProgressBar(container) {
        const loadingWrapper = document.createElement('div');
        loadingWrapper.className = 'costs-loading-wrapper';
        const loadingText = document.createElement('p');
        loadingText.className = 'costs-loading-text';
        loadingText.textContent = 'Berechnung der Unterhaltskosten läuft...';
        const progressContainer = document.createElement('div');
        progressContainer.className = 'costs-progress-container';
        const progressBar = document.createElement('div');
        progressBar.className = 'costs-progress-bar';
        progressContainer.appendChild(progressBar);
        loadingWrapper.appendChild(loadingText);
        loadingWrapper.appendChild(progressContainer);
        container.appendChild(loadingWrapper);
        let width = 0;
        const progressInterval = setInterval(() => {
            if (width < 95) { width += 2; progressBar.style.width = width + '%'; }
        }, 100);
        return { progressInterval, progressBar, loadingWrapper };
    }

    function hideCostsProgressBar(intervalId, progressBar, isError, callback) {
        if (intervalId) clearInterval(intervalId);
        progressBar.style.width = '100%';
        progressBar.style.background = isError ? 'var(--accent-red)' : 'var(--accent-green)';
        setTimeout(() => { if (callback) callback(); }, 700);
    }
    

    // --- 7. Event-Listener für Chat-Input ---
    sendButton.addEventListener('click', handleSendQuestion);
    questionInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSendQuestion();
    });
});
