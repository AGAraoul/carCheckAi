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
        const { type, data, context } = requestData; // 'context' für Folgefragen

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("API-Schlüssel nicht auf dem Server konfiguriert.");
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        let prompt;
        let requestPayload;

        if (type === 'FOLLOW_UP_QUESTION') {
            // Prompt für Folgefragen
            prompt = `Du bist ein KFZ-Meister. Beantworte die folgende Frage des Nutzers kurz und präzise. Berücksichtige dabei den Kontext der vorherigen Analyse.
            
            **Bisheriger Kontext:**
            ${JSON.stringify(context, null, 2)}

            **Neue Frage des Nutzers:**
            "${data}"
            
            Gib deine Antwort als einfachen Text zurück.`;
            
            requestPayload = {
                contents: [{ parts: [{ text: prompt }] }]
            };

        } else {
            // Bisheriger Prompt für die Erstanalyse
            const jsonFormat = `{
  "advantages": ["..."], "disadvantages": ["..."], "price_evaluation": "...", "red_flags": ["..."], "model_specific_issues": ["..."], "equipment_summary": "..."
}`;
            const basePrompt = `Du bist ein extrem erfahrener und kritischer KFZ-Meister. Analysiere die folgenden Fahrzeuginformationen sehr detailliert.

**Deine Aufgaben:**
1.  **Vor- und Nachteile:** Liste die wichtigsten Vor- und Nachteile auf, die einen direkten Einfluss auf Wert oder Zuverlässigkeit haben.
2.  **Preiseinschätzung:** Bewerte den Preis basierend auf den Fahrzeugdaten. Ist er fair, günstig oder teuer? Gib eine kurze Begründung.
3.  **Rote Flaggen:** Identifiziere typische "rote Flaggen" (z.B. "Verkauf im Kundenauftrag", "Bastlerfahrzeug", vage Formulierungen).
4.  **Modellspezifische Probleme:** Erwähne bekannte Schwachstellen oder teure Wartungsarbeiten für genau dieses Modell und Baujahr.
5.  **Ausstattung-Zusammenfassung:** Fasse die 3-4 wichtigsten und teuersten Ausstattungsmerkmale zusammen.

**Antwortformat:**
Gib deine Antwort NUR als JSON-Objekt zurück, ohne umschließende Markdown-Syntax. Das JSON-Objekt muss exakt folgendes Format haben:
${jsonFormat}`;

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
