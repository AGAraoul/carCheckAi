document.addEventListener('DOMContentLoaded', async () => {
    const chatContainer = document.getElementById('chat-container');
    const questionInput = document.getElementById('question-input');
    const sendButton = document.getElementById('send-button');
    const copyButton = document.getElementById('copy-button');
    const historyButton = document.getElementById('history-button');

    let currentAnalysisContext = null;

    // Lade die aktuelle Analyse
    const { currentAnalysisId, history } = await chrome.storage.local.get(['currentAnalysisId', 'history']);
    const currentAnalysis = history.find(item => item.id === currentAnalysisId);

    if (currentAnalysis) {
        currentAnalysisContext = currentAnalysis.originalQuery;
        displayAnalysis(currentAnalysis.analysisData);
    } else {
        displayError({ message: "Analyse konnte nicht geladen werden." });
    }

    function displayAnalysis(analysis) {
        if (analysis.error) {
            displayError(analysis.error);
            return;
        }
        // ... (Code zum Anzeigen der Analyse-Kategorien, wie in der letzten Version)
        // Dieser Teil bleibt gleich und fügt die HTML-Sektionen zum chatContainer hinzu.
    }

    function displayError(error) {
        chatContainer.innerHTML = `<div class="message bot-message error">${error.message}</div>`;
        questionInput.disabled = true;
        sendButton.disabled = true;
    }

    async function handleSendQuestion() {
        const question = questionInput.value.trim();
        if (!question || !currentAnalysisContext) return;

        appendMessage(question, 'user-message');
        questionInput.value = '';
        sendButton.disabled = true;

        const response = await chrome.runtime.sendMessage({
            type: 'FOLLOW_UP_QUESTION',
            data: { question, context: currentAnalysisContext }
        });

        if (response.error) {
            appendMessage(`Fehler: ${response.error.message}`, 'bot-message error');
        } else {
            appendMessage(response.answer, 'bot-message');
        }
        sendButton.disabled = false;
    }

    function appendMessage(text, className) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;
        messageDiv.textContent = text;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    sendButton.addEventListener('click', handleSendQuestion);
    questionInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSendQuestion();
    });

    copyButton.addEventListener('click', () => {
        // ... (Logik zum Kopieren des Textes)
    });

    historyButton.addEventListener('click', () => {
        chrome.windows.create({ url: 'history.html', type: 'popup', width: 400, height: 600 });
    });
});
