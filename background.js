// --- Initialisierung & Kontextmenü ---
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
        handleAnalysisRequest('ANALYZE_TEXT', info.selectionText, tab.url);
    }
});

// --- Listener für Nachrichten vom Popup ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ANALYZE_SCREENSHOT') {
        handleAnalysisRequest('ANALYZE_SCREENSHOT', request.data, sender.tab.url, sendResponse);
        return true;
    }
    if (request.type === 'FOLLOW_UP_QUESTION') {
        callBackendForFollowUp(request.data).then(response => {
            sendResponse(response);
        });
        return true;
    }
});

// --- Hauptfunktionen ---

// Behandelt die Erstanalyse und speichert sie im Verlauf
async function handleAnalysisRequest(type, data, url, sendResponse) {
    let loadingWindow;
    if (!sendResponse) { // Nur für Kontextmenü ein Ladefenster öffnen
        loadingWindow = await chrome.windows.create({ url: 'loading.html', type: 'popup', width: 800, height: 650 });
    }

    const analysis = await callBackendForAnalysis(type, data);

    if (analysis && !analysis.error) {
        const historyEntry = {
            id: Date.now(),
            title: analysis.price_evaluation || "Unbekanntes Fahrzeug", // Vereinfachter Titel
            url: url,
            date: new Date().toISOString(),
            analysisData: analysis,
            originalQuery: { type, data } // Speichert die Originalanfrage für Folgefragen
        };
        await saveToHistory(historyEntry);
        await chrome.storage.local.set({ currentAnalysisId: historyEntry.id });
    } else {
        // Bei Fehler trotzdem ein Ergebnisobjekt speichern, damit die Ergebnisseite es anzeigen kann
        await chrome.storage.local.set({ currentAnalysis: { analysisData: analysis } });
    }
    
    if (sendResponse) { // Antwort an Popup senden
        sendResponse({ analysis });
    } else { // Ladefenster weiterleiten
        await chrome.tabs.update(loadingWindow.tabs[0].id, { url: 'results.html' });
    }
}

// Speichert einen neuen Eintrag im Verlauf
async function saveToHistory(entry) {
    const result = await chrome.storage.local.get({ history: [] });
    const newHistory = [entry, ...result.history].slice(0, 50); // Limitiert auf 50 Einträge
    await chrome.storage.local.set({ history: newHistory });
}

// Ruft das Backend für eine Folgefrage auf
async function callBackendForFollowUp(data) {
    const backendUrl = 'https://carcheckai.netlify.app/.netlify/functions/analyze';
    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'FOLLOW_UP_QUESTION', data: data.question, context: data.context })
        });
        if (!response.ok) throw new Error(`Backend-Fehler ${response.status}`);
        const result = await response.json();
        const answer = result.candidates[0].content.parts[0].text;
        return { answer };
    } catch (error) {
        return { error: { message: error.message } };
    }
}


// Ruft das Backend für die Erstanalyse auf
async function callBackendForAnalysis(type, data) {
    const backendUrl = 'https://carcheckai.netlify.app/.netlify/functions/analyze';
    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, data })
        });
        if (!response.ok) throw new Error(`Backend-Fehler ${response.status}`);
        const result = await response.json();
        const analysisText = result.candidates[0].content.parts[0].text;
        return JSON.parse(analysisText);
    } catch (error) {
        console.error("Fehler bei der Kommunikation mit dem Backend:", error);
        return { error: { message: error.message } };
    }
}
