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
        // 'context' wurde in 'history' umbenannt, um die Konversation abzubilden
        const { type, data, history } = requestData; 

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("API-Schlüssel nicht auf dem Server konfiguriert.");
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        let prompt;
        let requestPayload;

        if (type === 'FOLLOW_UP_QUESTION') {
            // **NEUER, VERBESSERTER PROMPT FÜR FOLGEFRAGEN**
            prompt = `Du bist ein KFZ-Meister in einem Chat. Du hast bereits eine Erstanalyse für ein Fahrzeug geliefert. Jetzt beantwortest du Folgefragen des Nutzers.

**Deine Regeln:**
1.  Antworte immer kurz, präzise, sachlich und wahrheitsgetreu.
2.  Verwende **keine** Markdown-Formatierung (keine Sternchen, keine Listen, keine Aufzählungen). Formuliere deine Antwort in ganzen Sätzen als Fließtext.
3.  **Priorität 1:** Versuche die Frage zuerst ausschließlich mit den Informationen aus der "Erstanalyse" zu beantworten, die Teil des Gesprächsverlaufs ist.
4.  **Priorität 2:** Wenn die Erstanalyse die Frage nicht beantworten kann, gib an, dass du eine detaillierte Recherche durchführst und präsentiere dann eine fundierte, faktenbasierte Antwort.
5.  Behalte den gesamten Gesprächsverlauf im Auge, um auf vorherige Fragen und Antworten Bezug nehmen zu können.

**Bisheriger Gesprächsverlauf:**
${JSON.stringify(history, null, 2)}

**Neue Frage des Nutzers:**
"${data}"

Gib deine Antwort als reinen, unformatierten Text zurück.`;
            
            requestPayload = {
                contents: [{ parts: [{ text: prompt }] }]
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
3.  **Preiseinschätzung:** Bewerte den Preis (fair, günstig, teuer, etc.) mit kurzer Begründung.
4.  **Rote Flaggen:** Identifiziere typische "rote Flaggen".
5.  **Modellspezifische Probleme:** Erwähne bekannte Schwachstellen für dieses Modell und deren Reparaturkosten wenn man diese in einer Fachmännischen Werkstatt reparieren lässt.
6.  **Ausstattung-Zusammenfassung:** Fasse die 3 - 5 wichtigsten Ausstattungsmerkmale zusammen.

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
