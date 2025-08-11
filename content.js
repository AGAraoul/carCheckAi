// Dieses Skript wird programmatisch in die mobile.de-Seite injiziert.
// Es enthält nur die Logik zum Auslesen der Daten und gibt diese zurück.

function scrapeCarData() {
    try {
        console.log("KI-Bewerter: Starte Datenerfassung für neues Layout...");

        // --- Helferfunktion zum Suchen von Text ---
        const getText = (selector) => {
            const element = document.querySelector(selector);
            return element ? element.innerText.trim() : null;
        };

        // --- Datenextraktion für das neue Layout (basierend auf Screenshot) ---
        
        // Titel: Kombiniert Haupt- und Untertitel
        const mainTitle = getText('h1[data-testid="ad-title"]') || getText("h1");
        const subTitle = getText('h2[data-testid="ad-subtitle"]');
        let title = mainTitle;
        if (mainTitle && subTitle) {
            title = `${mainTitle} ${subTitle}`;
        }

        // Preis
        const price = getText('[data-testid="price-consumer-gross-price"]') || getText(".price-label--consumer-gross");

        // Eckdaten aus dem oberen Kachel-Grid
        const topFeatures = [];
        const featureElements = document.querySelectorAll('[data-testid="top-features"] > div');
        if (featureElements.length > 0) {
            featureElements.forEach(feature => {
                const label = feature.querySelector('div:first-child')?.innerText.trim();
                const value = feature.querySelector('div:last-child')?.innerText.trim();
                if (label && value) {
                    topFeatures.push(`${label}: ${value}`);
                }
            });
        }
        const mainFeatures = topFeatures.join(', ');

        // Beschreibung: Kombiniert "Technische Daten" und "Ausstattung"
        let description = '';
        const techDataElement = document.querySelector('[data-testid="technical-details"]');
        const equipmentElement = document.querySelector('[data-testid="features"]');

        if (techDataElement) {
            description += "Technische Daten:\n" + techDataElement.innerText + "\n\n";
        }
        if (equipmentElement) {
            description += "Ausstattung:\n" + equipmentElement.innerText;
        }

        // Fallback, falls die neuen Selektoren fehlschlagen (unwahrscheinlich, aber sicher ist sicher)
        if (!title || !price || !mainFeatures) {
            console.log("KI-Bewerter: Neues Layout nicht gefunden, versuche alte Selektoren...");
            return scrapeWithOldSelectors();
        }

        console.log("KI-Bewerter: Daten erfolgreich aus neuem Layout extrahiert.");
        return {
            title: title || 'Kein Titel',
            price: price || 'Kein Preis',
            mainFeatures: mainFeatures || 'Keine Eckdaten',
            description: description || 'Keine Beschreibung'
        };

    } catch (error) {
        console.error('KI-Bewerter: Fehler beim Auslesen der Fahrzeugdaten:', error);
        return null;
    }
}

/**
 * Fallback-Funktion mit den alten Selektoren, falls das neue Layout nicht erkannt wird.
 */
function scrapeWithOldSelectors() {
    const title = document.querySelector('#rbt-ad-title')?.innerText || 'Kein Titel';
    const price = document.querySelector('.price-block__price--regular, .g-col-6 .price-consumer-gross-price')?.innerText || 'Kein Preis';
    const mainFeatures = Array.from(document.querySelectorAll('#rbt-main-features .g-col-6'))
        .map(el => el.innerText.trim())
        .join(', ');
    const description = document.querySelector('#rbt-seller-description .u-margin-bottom-9')?.innerText || 'Keine Beschreibung';

    if (title === 'Kein Titel' && price === 'Kein Preis' && !mainFeatures) {
         return null;
    }
    return { title, price, mainFeatures, description };
}


// Der letzte Ausdruck im Skript ist sein Rückgabewert.
scrapeCarData();
