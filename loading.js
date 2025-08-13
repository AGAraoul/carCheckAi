document.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.getElementById('progress-bar');
    let width = 0;

    // Animiert den Fortschrittsbalken kontinuierlich
    const progressInterval = setInterval(() => {
        if (width < 98) { // Läuft fast bis zum Ende und wartet dann
            width++;
            progressBar.style.width = width + '%';
        } else {
            clearInterval(progressInterval);
        }
    }, 150);

    // Lauscht auf eine Nachricht vom background script, dass die Analyse fertig ist
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'ANALYSIS_COMPLETE') {
            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = request.isError ? '#dc2626' : '#16a34a';
            // Nach einer kurzen Pause wird zur Ergebnisseite weitergeleitet
            setTimeout(() => {
                window.location.href = 'results.html';
            }, 700);
        }
    });
});
