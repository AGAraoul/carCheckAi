// Diese Funktion läuft auf dem Netlify-Server und agiert als sicherer Proxy.

exports.handler = async function(event, context) {
    // CORS Preflight-Anfrage für die OPTIONS-Methode behandeln.
    // Dies ist ein Sicherheitscheck, den der Browser vor der eigentlichen Anfrage durchführt.
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", // Erlaubt Anfragen von jeder Herkunft
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            },
            body: ''
        };
    }

    // Nur POST-Anfragen für die eigentliche Analyse zulassen.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Die notwendigen Header, die mit jeder Antwort gesendet werden müssen.
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
    };

    try {
        // Die Daten aus der Anfrage der Chrome-Erweiterung auslesen.
        const requestData = JSON.parse(event.body);
        const { type, data } = requestData;

        // Den geheimen API-Schlüssel aus den Netlify Environment Variables holen.
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("API-Schlüssel nicht auf dem Server konfiguriert.");
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        let prompt;
        let requestPayload;

        // Je nach Typ (Text oder Screenshot) den richtigen Prompt und Payload erstellen.
        if (type === 'ANALYZE_TEXT') {
            prompt = `Du bist ein sehr erfahrener und kritischer KFZ-Meister. Analysiere den folgenden Text aus einer Gebrauchtwagenanzeige. Fasse dich extrem kurz und liste NUR die wichtigsten Punkte als Stichpunkte auf. Fokus liegt auf Dingen, die einen direkten Einfluss auf den Wert oder die Zuverlässigkeit haben. Ignoriere Standard-Ausstattung. Konzentriere dich auf teure Wartung, kritische Mängel oder besondere Vorteile. Analysiere diesen Text: "${data}" Gib deine Antwort NUR als JSON-Objekt zurück, ohne umschließende Markdown-Syntax, im Format: { "advantages": ["..."], "disadvantages": ["..."] }`;
            requestPayload = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            };
        } else if (type === 'ANALYZE_SCREENSHOT') {
            const base64Data = data.split(',')[1];
            prompt = `Du bist ein sehr erfahrener und kritischer KFZ-Meister. Analysiere den folgenden Screenshot einer Gebrauchtwagenanzeige von mobile.de. Extrahiere die wichtigsten Informationen direkt aus dem Bild. Fasse dich extrem kurz und liste NUR die wichtigsten Punkte als Stichpunkte auf. Fokus liegt auf Dingen, die einen direkten Einfluss auf den Wert oder die Zuverlässigkeit haben (z.B. Preis, Kilometerstand, Erstzulassung, besondere Ausstattung, erwähnte Mängel). Gib deine Antwort NUR als JSON-Objekt zurück, ohne umschließende Markdown-Syntax, im Format: { "advantages": ["..."], "disadvantages": ["..."] }`;
            requestPayload = {
                contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: base64Data } }] }],
                generationConfig: { responseMimeType: "application/json" }
            };
        } else {
            throw new Error("Ungültiger Analyse-Typ.");
        }

        // Die Anfrage an die Google-API senden.
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

        // Die Antwort von Google zurück an die Chrome-Erweiterung senden.
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
