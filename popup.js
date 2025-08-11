document.addEventListener('DOMContentLoaded', () => {
    const screenshotButton = document.getElementById('analyze-screenshot-button');
    const statusDiv = document.getElementById('status');
    const infoText = document.getElementById('info-text');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    let progressInterval = null;

    // Prüft, ob wir uns auf einer mobile.de-Seite befinden.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (!currentTab || !currentTab.url || !currentTab.url.includes('mobile.de')) {
            screenshotButton.disabled = true;
            infoText.innerHTML = 'Bitte navigieren Sie zu einer mobile.de Seite, um die Analyse zu starten.';
        }
    });

    // --- Event-Listener für den Screenshot-Button ---
    screenshotButton.addEventListener('click', () => {
        screenshotButton.disabled = true;
        statusDiv.textContent = 'Erstelle Screenshot...';
        startProgressBar();

        chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 90 }, (dataUrl) => {
            if (chrome.runtime.lastError || !dataUrl) {
                console.error("Fehler bei captureVisibleTab:", chrome.runtime.lastError?.message || "dataUrl ist leer.");
                handleError('Fehler beim Erstellen des Screenshots.');
                return;
            }
            statusDiv.textContent = 'Screenshot an KI gesendet. Analyse läuft...';

            chrome.runtime.sendMessage({ type: 'ANALYZE_SCREENSHOT', data: dataUrl }, (response) => {
                const analysisError = response?.analysis?.error;
                if (chrome.runtime.lastError || !response || !response.analysis || analysisError) {
                    const errorMessage = analysisError?.message || chrome.runtime.lastError?.message || 'Unbekannter Fehler in der Antwort des Backends.';
                    handleError(`Analyse fehlgeschlagen.`);
                    console.error('Fehler von der KI-Analyse:', errorMessage);
                } else {
                    statusDiv.textContent = 'Analyse erfolgreich!';
                    stopProgressBar(false);
                    
                    setTimeout(() => {
                        chrome.storage.local.set({ analysisResult: response.analysis }, () => {
                            chrome.windows.create({
                                url: 'results.html', type: 'popup', width: 800, height: 650
                            });
                            window.close();
                        });
                    }, 1000);
                }
            });
        });
    });

    // --- Hilfsfunktionen ---
    function handleError(message) {
        statusDiv.textContent = message;
        screenshotButton.disabled = false;
        stopProgressBar(true);
    }

    function startProgressBar() {
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressBar.style.backgroundColor = '#4f46e5';
        let width = 0;

        progressInterval = setInterval(() => {
            if (width < 90) {
                width++;
                progressBar.style.width = width + '%';
            } else {
                clearInterval(progressInterval);
            }
        }, 150);
    }

    function stopProgressBar(isError = false) {
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        
        if (isError) {
            progressBar.style.backgroundColor = '#dc2626';
        } else {
            progressBar.style.backgroundColor = '#16a34a';
        }
        progressBar.style.width = '100%';

        setTimeout(() => {
            progressContainer.classList.add('hidden');
        }, 1000);
    }
});
