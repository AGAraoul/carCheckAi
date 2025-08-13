document.addEventListener('DOMContentLoaded', async () => {
    const chatContainer = document.getElementById('chat-container');
    const questionInput = document.getElementById('question-input');
    const sendButton = document.getElementById('send-button');
    const copyButton = document.getElementById('copy-button');

    let originalQueryContext = null;

    // Lade die aktuelle Analyse direkt
    const { currentAnalysis } = await chrome.storage.local.get('currentAnalysis');

    if (currentAnalysis && currentAnalysis.analysisData) {
        originalQueryContext = currentAnalysis.originalQuery;
        displayAnalysis(currentAnalysis.analysisData);
        // Lösche die Analyse aus dem Speicher, nachdem sie geladen wurde
        chrome.storage.local.remove('currentAnalysis');
    } else {
        displayError({ message: "Analyse konnte nicht geladen werden oder ist fehlerhaft." });
    }

    function displayAnalysis(analysis) {
        if (analysis.error) {
            displayError(analysis.error);
            return;
        }

        const createSection = (title, content, className) => {
            if (!content || (Array.isArray(content) && content.length === 0)) {
                return `<div class="result-section ${className}"><h4>${title}</h4><ul><li>Keine spezifischen Daten gefunden.</li></ul></div>`;
            }
            if (Array.isArray(content)) {
                const itemsHTML = content.map(item => `<li>${item}</li>`).join('');
                return `<div class="result-section ${className}"><h4>${title}</h4><ul>${itemsHTML}</ul></div>`;
            }
            return `<div class="result-section ${className}"><h4>${title}</h4><p>${content}</p></div>`;
        };

        const analysisHTML = `
            ${createSection('Preiseinschätzung', analysis.price_evaluation, 'price-section')}
            ${createSection('Top-Ausstattung', analysis.equipment_summary, 'equipment-section')}
            ${createSection('Vorteile', analysis.advantages, 'advantages-section')}
            ${createSection('Nachteile / Risiken', analysis.disadvantages, 'disadvantages-section')}
            ${createSection('Rote Flaggen', analysis.red_flags, 'redflags-section')}
            ${createSection('Bekannte Modell-Probleme', analysis.model_specific_issues, 'issues-section')}
        `;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.innerHTML = analysisHTML;
        chatContainer.appendChild(messageDiv);
    }

    function displayError(error) {
        chatContainer.innerHTML = `<div class="message bot-message error-section"><h4>Fehler</h4><p>${error.message}</p></div>`;
        questionInput.disabled = true;
        sendButton.disabled = true;
    }

    async function handleSendQuestion() {
        const question = questionInput.value.trim();
        if (!question || !originalQueryContext) return;

        appendMessage(question, 'user-message');
        questionInput.value = '';
        sendButton.disabled = true;

        const response = await chrome.runtime.sendMessage({
            type: 'FOLLOW_UP_QUESTION',
            data: { question, context: originalQueryContext }
        });

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
        // Wandelt Zeilenumbrüche in <br>-Tags um, für eine bessere Formatierung der KI-Antwort
        messageDiv.innerHTML = text.replace(/\n/g, '<br>');
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    copyButton.addEventListener('click', () => {
        const analysisContent = chatContainer.querySelector('.bot-message').innerText;
        navigator.clipboard.writeText(analysisContent).then(() => {
            copyButton.textContent = 'Kopiert!';
            setTimeout(() => { copyButton.textContent = 'Analyse kopieren'; }, 2000);
        });
    });

    sendButton.addEventListener('click', handleSendQuestion);
    questionInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSendQuestion();
    });
});
