// Diese Funktion läuft auf dem Netlify-Server und agiert als sicherer Proxy.

exports.handler = async function(event, context) {
    // CORS Preflight-Anfrage
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
    };

    try {
        const requestData = JSON.parse(event.body);
        const { type, data, history, vehicleInfo, userInfo } = requestData;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("API-Schlüssel nicht auf dem Server konfiguriert.");
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        let prompt;
        let requestPayload;

        if (type === 'FOLLOW_UP_QUESTION') {
            prompt = `Du bist ein KFZ-Meister in einem Chat. Du hast bereits eine Erstanalyse für ein Fahrzeug geliefert. Jetzt beantwortest du Folgefragen des Nutzers.
**Deine Regeln:**
1. Antworte immer kurz, präzise, sachlich und wahrheitsgetreu.
2. Verwende **keine** Markdown-Formatierung (keine Sternchen, Listen etc.). Formuliere deine Antwort in ganzen Sätzen als Fließtext.
3. Nutze dein umfangreiches Wissen und den gesamten Gesprächsverlauf, um die bestmögliche Antwort zu geben.
**Bisheriger Gesprächsverlauf:**
${JSON.stringify(history, null, 2)}
**Neue Frage des Nutzers:**
"${data}"
Gib deine Antwort als reinen, unformatierten Text zurück.`;
            
            requestPayload = {
                contents: [{ parts: [{ text: prompt }] }]
            };

        } else if (type === 'CALCULATE_OWNERSHIP_COSTS') {
            // NEUER PROMPT FÜR DIE KOSTENBERECHNUNG
            const costsJsonFormat = `{
  "vehicle_tax": { "amount": 0, "details": "..." },
  "insurance": { "amount": 0, "details": "..." },
  "maintenance": { "amount": 0, "details": "..." },
  "fuel_costs": { "amount": 0, "details": "..." },
  "total_annual_cost": 0,
  "total_monthly_cost": 0
}`;
            prompt = `Du bist ein deutscher KFZ-Kostenexperte. Deine Aufgabe ist es, eine detaillierte und realistische Schätzung der jährlichen Haltungskosten für ein spezifisches Fahrzeug in Deutschland zu erstellen.

**Deine Regeln:**
1.  **Recherchiere sorgfältig:** Nutze dein internes Wissen, um genaue Werte zu ermitteln.
2.  **Sei spezifisch:** Beziehe dich exakt auf das angegebene Fahrzeug und die Nutzerdaten.
3.  **Begründe deine Schätzungen:** Gib zu jedem Kostenpunkt eine kurze, klare Erklärung.
4.  **Antwortformat:** Gib deine Antwort NUR als JSON-Objekt zurück, ohne umschließende Markdown-Syntax. Das JSON-Objekt muss exakt folgendes Format haben:
${costsJsonFormat}

**Fahrzeuginformationen:**
- Fahrzeug: ${vehicleInfo.vehicle_title}
- Preis: ${vehicleInfo.price_evaluation}
- Bekannte Probleme: ${vehicleInfo.model_specific_issues?.join(', ') || 'Keine spezifischen bekannt'}

**Nutzerinformationen für die Versicherung:**
- Alter: ${userInfo.age}
- Versicherungstyp: ${userInfo.insuranceType}
- SF-Klasse: ${userInfo.sfClass}
- Standort (PLZ): ${userInfo.location}

**Deine Aufgaben im Detail:**
1.  **KFZ-Steuer:** Berechne die genaue jährliche KFZ-Steuer basierend auf den Fahrzeugdaten des analysierten Fahrzeugs (Hubraum, CO2-Werte, Erstzulassung). Gib die Berechnungsgrundlage in den Details an.
2.  **Versicherung:** Schätze die jährlichen Versicherungskosten basierend auf dem Fahrzeugmodell (Typschlüssel), dem Alter des Fahrers, der SF-Klasse, dem Versicherungstyp und dem Standort. Gib die Annahmen in den Details an.
3.  **Wartung:** Schätze die durchschnittlichen jährlichen Wartungskosten. Berücksichtige typische Inspektionskosten und erwähne eventuell bald anstehende, teure Reparaturen (z.B. Zahnriemenwechsel, basierend auf typischen Intervallen für dieses Modell).
4.  **Spritkosten:** Recherchiere den aktuellen Durchschnitts-Spritpreis für die angegebene PLZ (oder nutze einen realistischen bundesweiten Durchschnitt, falls die lokale Suche nicht möglich ist). Berechne die jährlichen Spritkosten basierend auf dem von dir recherchierten Durchschnittsverbrauch des Fahrzeugs bei einer Fahrleistung von 15.000 km/Jahr. Gib den angenommenen Verbrauch, den Spritpreis und die Fahrleistung in den Details an.
5.  **Gesamtkosten:** Berechne die Summe aller jährlichen Kosten und den daraus resultierenden monatlichen Durchschnittswert.

Führe die Analyse jetzt durch und gib das Ergebnis als valides JSON zurück.`;

            requestPayload = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            };

        } else {
            // Der Prompt für die Erstanalyse bleibt unverändert
            const jsonFormat = `{
  "vehicle_title": "...", "advantages": ["..."], "disadvantages": ["..."], "price_evaluation": "...", "red_flags": ["..."], "model_specific_issues": ["..."], "equipment_summary": "..."
}`;
            const basePrompt = `Du bist ein extrem erfahrener und kritischer KFZ-Meister. Analysiere die folgenden Fahrzeuginformationen sehr detailliert.
**Deine Aufgaben:**
1.  **Fahrzeugtitel extrahieren:** Identifiziere und extrahiere den vollständigen Fahrzeugtitel (Marke, Modell, Ausstattung).
2.  **Vor- und Nachteile:** Liste die wichtigsten Vor- und Nachteile auf.
3.  **Preiseinschätzung:** Bewerte den Preis (fair, günstig, teuer, sowie nenne diesen ebenfalls in der Analyse) mit ganz kurzer Begründung (Für diesen Punkt maximal 3 Sätze).
4.  **Rote Flaggen:** Identifiziere typische "rote Flaggen".
5.  **Modellspezifische Probleme:** Erwähne bekannte Schwachstellen für dieses Modell.
6.  **Ausstattung-Zusammenfassung:** Fasse die 3-4 wichtigsten Ausstattungsmerkmale zusammen.
7.  **Verwende **keine** Markdown-Formatierung (keine Sternchen, Listen etc.).
**Antwortformat:**
Gib deine Antwort NUR als JSON-Objekt zurück, ohne umschließende Markdown-Syntax. Das JSON-Objekt muss exakt folgendes Format haben:\n${jsonFormat}`;

            if (type === 'ANALYZE_TEXT') {
                prompt = `${basePrompt}\n\n**Analysiere diesen Text:** "${data}"`;
            } else if (type === 'ANALYZE_SCREENSHOT') {
                prompt = `${basePrompt}\n\n**Analysiere diesen Screenshot:**`;
            } else {
                throw new Error("Ungültiger Analyse-Typ.");
            }

            requestPayload = {
                contents: [{ 
                    parts: type === 'ANALYZE_TEXT'
                        ? [{ text: prompt }]
                        : [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: data.split(',')[1] } }]
                }],
                generationConfig: { responseMimeType: "application/json" }
            };
        }

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            throw new Error(`Google API Fehler ${apiResponse.status}: ${errorBody}`);
        }

        const responseData = await apiResponse.json();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(responseData)
        };

    } catch (error) {
        console.error("Fehler in der Netlify Function:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: { message: error.message } })
        };
    }
};
