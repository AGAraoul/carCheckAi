document.addEventListener('DOMContentLoaded', async () => {
    // --- Globale Elemente ---
    const vehicleTitleElement = document.getElementById('vehicle-title');
    const initialAnalysisContainer = document.getElementById('initial-analysis-container');
    const headerActions = document.querySelector('.header-actions');
    
    // --- Header-Buttons ---
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

    // --- Share-Elemente (NEU) ---
    const shareOverlay = document.getElementById('share-overlay');
    const closeShareButton = document.getElementById('close-share-button');
    const sendWhatsappButton = document.getElementById('send-whatsapp-button');
    const phoneInput = document.getElementById('phone-input');
    const shareStatus = document.getElementById('share-status');

    // --- Globale Zustände ---
    let initialAnalysisData = null;
    let isWelcomeMessageShown = false;

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

    function displayAnalysis(analysis) {
        if (analysis.error) {
            displayError(analysis.error);
            return;
        }

        vehicleTitleElement.textContent = analysis.vehicle_title || "Unbekanntes Fahrzeug";

        const icons = {
            price: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
            equipment: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-4.44a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8.88a2 2 0 0 0 2-2v-8.88z"></path><path d="M18 2h-2.12a2 2 0 0 0-1.77 1.03L12 6"></path></svg>`,
            advantages: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
            disadvantages: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
            red_flags: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
            issues: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
        };

        const createSection = (title, content, className, icon) => {
            if (!content || (Array.isArray(content) && content.length === 0)) return '';
            const itemsHTML = Array.isArray(content) ? `<ul>${content.map(item => `<li>${item}</li>`).join('')}</ul>` : `<p>${content}</p>`;
            return `<div class="result-section ${className}"><h4>${icon}${title}</h4>${itemsHTML}</div>`;
        };

        const analysisHTML = `
            ${createSection('Preiseinschätzung', analysis.price_evaluation, 'price-section', icons.price)}
            ${createSection('Top-Ausstattung', analysis.equipment_summary, 'equipment-section', icons.equipment)}
            ${createSection('Vorteile', analysis.advantages, 'advantages-section', icons.advantages)}
            ${createSection('Nachteile / Risiken', analysis.disadvantages, 'disadvantages-section', icons.disadvantages)}
            ${createSection('Rote Flaggen', analysis.red_flags, 'redflags-section', icons.red_flags)}
            ${createSection('Bekannte Modell-Probleme', analysis.model_specific_issues, 'issues-section', icons.issues)}
        `;
        
        initialAnalysisContainer.innerHTML = analysisHTML;
    }

    function displayError(error) {
        vehicleTitleElement.textContent = "Fehler";
        initialAnalysisContainer.innerHTML = `<div class="result-section error-section"><h4>Analyse fehlgeschlagen</h4><p>${error.message}</p></div>`;
        if (headerActions) {
            headerActions.style.display = 'none';
        }
    }

    // --- 2. Logik für das Chat-Overlay ---
    headerChatButton.addEventListener('click', () => {
        chatOverlay.classList.add('is-visible');
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

    closeChatButton.addEventListener('click', () => chatOverlay.classList.remove('is-visible'));

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
    headerCostsButton.addEventListener('click', () => {
        costsOverlay.classList.add('is-visible');
    });

    closeCostsButton.addEventListener('click', () => {
        costsOverlay.classList.remove('is-visible');
    });

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
        costsResultContainer.innerHTML = ''; // Inhalt leeren
        
        const { progressInterval, progressBar, loadingWrapper } = showCostsProgressBar(costsResultContainer);

        const response = await chrome.runtime.sendMessage({
            type: 'CALCULATE_OWNERSHIP_COSTS',
            vehicleInfo: initialAnalysisData,
            userInfo: userInfo
        });

        const isError = !!response.error;

        hideCostsProgressBar(progressInterval, progressBar, isError, () => {
            loadingWrapper.remove(); // Entfernt den gesamten Lade-Wrapper
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
                    <p style="font-size: 13px; color: #64748b;">${costItem.details}</p>
                </div>
            `;
        };

        const costsHTML = `
            ${createCostSection('KFZ-Steuer', costs.vehicle_tax)}
            ${createCostSection('Versicherung', costs.insurance)}
            ${createCostSection('Wartung & Reparaturen', costs.maintenance)}
            ${createCostSection('Spritkosten', costs.fuel_costs)}
            <div class="costs-summary">
                <h3>Geschätzte Gesamtkosten</h3>
                <p class="total-annual">${costs.total_annual_cost} € / Jahr</p>
                <p class="total-monthly">oder ca. ${costs.total_monthly_cost} € / Monat</p>
            </div>
        `;
        costsResultContainer.innerHTML = costsHTML;
    }

    // --- 5. Logik für WhatsApp Share (NEU) ---
    headerShareButton.addEventListener('click', () => {
        shareOverlay.classList.add('is-visible');
        phoneInput.focus();
    });

    closeShareButton.addEventListener('click', () => {
        shareOverlay.classList.remove('is-visible');
    });

    sendWhatsappButton.addEventListener('click', () => {
        const phoneNumber = phoneInput.value.replace(/[\s+()-]/g, ''); // Bereinigt die Nummer
        
        if (!/^\d+$/.test(phoneNumber) || phoneNumber.length < 10) {
            shareStatus.textContent = 'Bitte eine gültige Handynummer eingeben.';
            shareStatus.style.color = '#dc2626';
            return;
        }
        shareStatus.textContent = '';

        // --- Analyse-Text für WhatsApp formatieren ---
        let textToShare = `*KI Fahrzeug-Bewertung für: ${vehicleTitleElement.textContent}*\n\n`;
        const sections = initialAnalysisContainer.querySelectorAll('.result-section');
        sections.forEach(section => {
            const title = section.querySelector('h4').innerText.trim();
            textToShare += `*${title}*\n`;
            const content = section.querySelector('ul, p');
            if (content.tagName === 'P') {
                textToShare += content.innerText.trim() + '\n\n';
            } else { // UL
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

        // --- WhatsApp Link öffnen ---
        const encodedText = encodeURIComponent(textToShare);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
        shareOverlay.classList.remove('is-visible');
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
            if (width < 95) {
                width += 2;
                progressBar.style.width = width + '%';
            }
        }, 100);
        return { progressInterval, progressBar, loadingWrapper };
    }

    function hideCostsProgressBar(intervalId, progressBar, isError, callback) {
        if (intervalId) clearInterval(intervalId);
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = isError ? '#dc2626' : '#16a34a';
        setTimeout(() => { if (callback) callback(); } , 700);
    }

    // --- 7. Event-Listener ---
    sendButton.addEventListener('click', handleSendQuestion);
    questionInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSendQuestion();
    });
});
