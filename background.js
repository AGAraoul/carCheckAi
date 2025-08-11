// --- Initialisierung: Kontextmenü erstellen ---
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "analyze-selected-text",
        title: "Markierten Text mit KI analysieren",
        contexts: ["selection"]
    });
});

// --- Listener für das Kontextmenü ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "analyze-selected-text" && info.selectionText) {
        const loadingWindow = await chrome.windows.create({
            url: 'loading.html',
            type: 'popup',
            width: 800,
            height: 650
        });
        
        const analysis = await callBackendForAnalysis('ANALYZE_TEXT', info.selectionText);
        
        await chrome.storage.local.set({ analysisResult: analysis });
        await chrome.tabs.update(loadingWindow.tabs[0].id, { url: 'results.html' });
    }
});

// --- Listener für Nachrichten vom Popup (für Screenshot-Analyse) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ANALYZE_SCREENSHOT') {
        callBackendForAnalysis('ANALYZE_SCREENSHOT', request.data).then(analysis => {
            sendResponse({ analysis });
        });
        return true; // Wichtig für asynchrone Antwort
    }
});

// --- Neue zentrale Funktion zur Kommunikation mit deinem Backend ---
async function callBackendForAnalysis(type, data) {
    // WICHTIG: Ersetze dies durch die URL deiner Netlify-Seite.
    const backendUrl = 'https://carcheckai.netlify.app/';

    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, data })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `Backend-Fehler ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.candidates?.[0]?.content?.parts?.[0]) {
            throw new Error('Unerwartete API-Antwortstruktur vom Backend.');
        }
        const analysisText = result.candidates[0].content.parts[0].text;
        return JSON.parse(analysisText);

    } catch (error) {
        console.error("Fehler bei der Kommunikation mit dem Backend:", error);
        return { error: { message: error.message } };
    }
}
