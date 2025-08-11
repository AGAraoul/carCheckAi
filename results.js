// Dieses Skript füllt das Ergebnis-Fenster (results.html) mit Leben

document.addEventListener('DOMContentLoaded', () => {
    const resultContentDiv = document.getElementById('result-content');

    // Holt das Analyse-Ergebnis aus dem lokalen Speicher der Erweiterung
    chrome.storage.local.get(['analysisResult'], (data) => {
        if (data.analysisResult) {
            const analysis = data.analysisResult;
            let contentHTML = '';

            // Baut das HTML basierend auf dem Analyse-Ergebnis auf
            if (analysis.error) {
                // Liest die Nachricht aus dem Fehlerobjekt aus
                const errorMessage = analysis.error.message || 'Ein unbekannter Fehler ist aufgetreten.';
                contentHTML = `<div class="result-section error-section"><h4>Fehler</h4><p>${errorMessage}</p></div>`;
            } else {
                const advantagesHTML = analysis.advantages && analysis.advantages.length > 0
                    ? analysis.advantages.map(item => `<li>${item}</li>`).join('')
                    : '<li>Keine spezifischen Vorteile gefunden.</li>';

                const disadvantagesHTML = analysis.disadvantages && analysis.disadvantages.length > 0
                    ? analysis.disadvantages.map(item => `<li>${item}</li>`).join('')
                    : '<li>Keine spezifischen Nachteile gefunden.</li>';

                contentHTML = `
                    <div class="result-section advantages-section">
                        <h4>Vorteile</h4>
                        <ul>${advantagesHTML}</ul>
                    </div>
                    <div class="result-section disadvantages-section">
                        <h4>Nachteile / Risiken</h4>
                        <ul>${disadvantagesHTML}</ul>
                    </div>
                `;
            }

            resultContentDiv.innerHTML = contentHTML;

            // Bereinigt den Speicher, nachdem die Daten angezeigt wurden
            chrome.storage.local.remove('analysisResult');

        } else {
            resultContentDiv.innerHTML = '<div class="result-section error-section"><h4>Fehler</h4><p>Keine Analyse-Daten gefunden. Bitte versuchen Sie es erneut.</p></div>';
        }
    });
});
