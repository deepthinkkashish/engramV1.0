const fs = require('fs');
const path = 'services/testSeriesService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/try \{\s+let response;\s+try \{\s+response = await client\.models\.generateContent\(\{[\s\S]*?throw apiErr;\s+\}\s+\}\s+incrementUsage\(\);/m, 
`try {
        let response;
        try {
            response = await client.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                    temperature: 0.2
                }
            });
        } catch (apiErr) {
            const errStr = (apiErr.message || "").toLowerCase();
            if (apiErr.status === 403 || apiErr.status === 404 || apiErr.status === 429 || errStr.includes('403') || errStr.includes('404') || errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('permission')) {
                console.warn("Model " + modelName + " failed with quota/permission/404, falling back to gemini-3.6-flash", apiErr.message);
                modelName = 'gemini-3.6-flash';
                response = await client.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: responseSchema,
                        temperature: 0.2
                    }
                });
            } else {
                throw apiErr;
            }
        }
        
        incrementUsage();`);

fs.writeFileSync(path, code);
