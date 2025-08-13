document.addEventListener('DOMContentLoaded', async () => {
    // Elemente der Hauptseite
    const initialAnalysisContainer = document.getElementById('initial-analysis-container');
    const openChatButton = document.getElementById('open-chat-button');
    const copyButton = document.getElementById('copy-button');

    // Elemente des Chat-Overlays
    const chatOverlay = document.getElementById('chat-overlay');
    const closeChatButton = document.getElementById('close-chat-button');
    const chatMessagesContainer = document.getElementById('chat-messages-container');
    const questionInput = document.getElementById('question-input');
    const sendButton = document.getElementById('send-button');

    let originalQueryContext = null;
    let isWelcomeMessageShown = false;

    // --- 1. Laden der Erstanalyse ---
    const { currentAnalysis } = await chrome.storage.local.get('currentAnalysis');

    if (currentAnalysis && currentAnalysis.analysisData) {
        originalQueryContext = currentAnalysis.originalQuery;
        displayAnalysis(currentAnalysis.analysisData);
        chrome.storage.local.remove('currentAnalysis');
    } else {
        displayError({ message: "Analyse konnte nicht geladen werden oder ist fehlerhaft." });
    }

    function displayAnalysis(analysis) {
        if (analysis.error) {
            displayError(analysis.error);
            return;
        }

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
        initialAnalysisContainer.innerHTML = `<div class="result-section error-section"><h4>Fehler</h4><p>${error.message}</p></div>`;
        openChatButton.style.display = 'none';
    }

    // --- 2. Logik für das Chat-Overlay ---
    openChatButton.addEventListener('click', () => {
        chatOverlay.classList.add('is-visible');
        
        // Zeigt die Willkommensnachricht nur beim ersten Öffnen an
        if (!isWelcomeMessageShown) {
            isWelcomeMessageShown = true;
            showTypingIndicator();
            setTimeout(() => {
                hideTypingIndicator();
                appendMessage("Hallo! Ich bin dein digitaler KFZ-Meister. Wie kann ich dir weiterhelfen?", 'bot-message');
                questionInput.focus();
            }, 1500);
        } else {
            questionInput.focus();
        }
    });

    closeChatButton.addEventListener('click', () => {
        chatOverlay.classList.remove('is-visible');
    });

    // --- 3. Logik für Folgefragen ---
    async function handleSendQuestion() {
        const question = questionInput.value.trim();
        if (!question || !originalQueryContext) return;

        appendMessage(question, 'user-message');
        questionInput.value = '';
        sendButton.disabled = true;
        showTypingIndicator();

        const response = await chrome.runtime.sendMessage({
            type: 'FOLLOW_UP_QUESTION',
            data: { question, context: originalQueryContext }
        });
        
        hideTypingIndicator();

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

    // --- 4. Hilfsfunktionen für die "Schreibt..."-Animation ---
    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message bot-message typing-indicator';
        indicator.innerHTML = `<span></span><span></span><span></span>`;
        chatMessagesContainer.appendChild(indicator);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    function hideTypingIndicator() {
        const indicator = chatMessagesContainer.querySelector('.typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // --- 5. Event-Listener ---
    sendButton.addEventListener('click', handleSendQuestion);
    questionInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSendQuestion();
    });

    copyButton.addEventListener('click', () => {
        let textToCopy = initialAnalysisContainer.innerText;
        const chatText = chatMessagesContainer.innerText;

        if (chatText) {
            textToCopy += '\n\n--- Folgefragen ---\n' + chatText;
        }
                                
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyButton.textContent = 'Kopiert!';
            setTimeout(() => { copyButton.textContent = 'Gesamte Analyse kopieren'; }, 2000);
        });
    });
});
