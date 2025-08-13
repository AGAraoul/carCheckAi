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
        const loadingWindow = await chrome.windows.create({
            url: 'loading.html',
            type: 'popup',
            width: 800,
            height: 650
        });
        
        const analysis = await callBackendForAnalysis('ANALYZE_TEXT', info.selectionText);
        
        await chrome.storage.local.set({ currentAnalysis: { analysisData: analysis } });

        chrome.tabs.sendMessage(loadingWindow.tabs[0].id, {
            type: 'ANALYSIS_COMPLETE',
            isError: !!analysis.error
        });
    }
});

// --- Listener für Nachrichten vom Frontend ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ANALYZE_SCREENSHOT') {
        handleAnalysisRequest('ANALYZE_SCREENSHOT', request.data, sendResponse);
        return true; // Hält den Message Channel für die asynchrone Antwort offen
    }
    if (request.type === 'FOLLOW_UP_QUESTION') {
        callBackendForFollowUp(request).then(sendResponse);
        return true; // Hält den Message Channel für die asynchrone Antwort offen
    }
    // NEUER HANDLER FÜR KOSTENBERECHNUNG
    if (request.type === 'CALCULATE_OWNERSHIP_COSTS') {
        callBackendForCostCalculation(request).then(sendResponse);
        return true; // Hält den Message Channel für die asynchrone Antwort offen
    }
});

// --- Hauptfunktionen ---

async function handleAnalysisRequest(type, data, sendResponse) {
    const analysis = await callBackendForAnalysis(type, data);
    await chrome.storage.local.set({ currentAnalysis: { analysisData: analysis } });
    sendResponse({ analysis });
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
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `Backend-Fehler ${response.status}`);
        }
        const result = await response.json();
        const analysisText = result.candidates[0].content.parts[0].text;
        return JSON.parse(analysisText);
    } catch (error) {
        console.error("Fehler bei der Kommunikation mit dem Backend:", error);
        return { error: { message: error.message } };
    }
}

// Ruft das Backend für eine Folgefrage auf
async function callBackendForFollowUp(request) {
    const backendUrl = 'https://carcheckai.netlify.app/.netlify/functions/analyze';
    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                type: 'FOLLOW_UP_QUESTION', 
                data: request.data, 
                history: request.history 
            })
        });
        if (!response.ok) throw new Error(`Backend-Fehler ${response.status}`);
        const result = await response.json();
        const answer = result.candidates[0].content.parts[0].text;
        return { answer };
    } catch (error) {
        return { error: { message: error.message } };
    }
}

// NEUE FUNKTION: Ruft das Backend für die Kostenberechnung auf
async function callBackendForCostCalculation(request) {
    const backendUrl = 'https://carcheckai.netlify.app/.netlify/functions/analyze';
    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'CALCULATE_OWNERSHIP_COSTS',
                vehicleInfo: request.vehicleInfo,
                userInfo: request.userInfo
            })
        });
        if (!response.ok) {
             const errorData = await response.json();
            throw new Error(errorData.error.message || `Backend-Fehler ${response.status}`);
        }
        const result = await response.json();
        const costsText = result.candidates[0].content.parts[0].text;
        return { costs: JSON.parse(costsText) };
    } catch (error) {
        console.error("Fehler bei der Kostenberechnung:", error);
        return { error: { message: error.message } };
    }
}
