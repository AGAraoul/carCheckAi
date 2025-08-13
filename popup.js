document.addEventListener('DOMContentLoaded', () => {
    const screenshotButton = document.getElementById('analyze-screenshot-button');
    const statusDiv = document.getElementById('status');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    let progressInterval = null;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (!currentTab || !currentTab.url || !(currentTab.url.includes('mobile.de') || currentTab.url.includes('autoscout24.de'))) {
            screenshotButton.disabled = true;
            statusDiv.textContent = 'Bitte zu einer unterstützten Fahrzeugseite navigieren.';
        }
    });

    screenshotButton.addEventListener('click', () => {
        screenshotButton.disabled = true;
        statusDiv.textContent = 'Erstelle Screenshot...';
        startProgressBar();

        chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 90 }, (dataUrl) => {
            if (chrome.runtime.lastError || !dataUrl) {
                handleError('Fehler beim Erstellen des Screenshots.');
                return;
            }
            statusDiv.textContent = 'Screenshot an KI gesendet. Analyse läuft...';

            chrome.runtime.sendMessage({ type: 'ANALYZE_SCREENSHOT', data: dataUrl }, (response) => {
                const analysisError = response?.analysis?.error;
                if (chrome.runtime.lastError || !response || !response.analysis || analysisError) {
                    const errorMessage = analysisError?.message || chrome.runtime.lastError?.message || 'Unbekannter Fehler.';
                    handleError(`Analyse fehlgeschlagen.`);
                    console.error('Fehler von der KI-Analyse:', errorMessage);
                } else {
                    statusDiv.textContent = 'Analyse erfolgreich!';
                    stopProgressBar(false, () => {
                        chrome.windows.create({
                            url: 'results.html', type: 'popup', width: 800, height: 650
                        });
                        window.close();
                    });
                }
            });
        });
    });

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
            if (width < 95) {
                width += 2;
                progressBar.style.width = width + '%';
            } else {
                clearInterval(progressInterval);
            }
        }, 250);
    }

    function stopProgressBar(isError = false, callback) {
        if (progressInterval) clearInterval(progressInterval);
        
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = isError ? '#dc2626' : '#16a34a';

        setTimeout(() => {
            if (callback) callback();
        }, 700); // Kurze Pause, damit man die grüne Farbe sieht
    }
});
