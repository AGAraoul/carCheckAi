document.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.getElementById('progress-bar');
    let width = 0;

    // Startet die Animation des Fortschrittsbalkens sofort.
    // Sie läuft, bis das Hintergrundskript dieses Fenster zur Ergebnisseite weiterleitet.
    const progressInterval = setInterval(() => {
        if (width < 95) { // Läuft bis 95% und wartet dann
            width++;
            progressBar.style.width = width + '%';
        } else {
            clearInterval(progressInterval);
        }
    }, 150); // Gleiche Geschwindigkeit wie der andere Fortschrittsbalken
});
