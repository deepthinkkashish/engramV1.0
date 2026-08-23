const fs = require('fs');
const path = 'services/testSeriesService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/let response;\s*try \{\s*response = await client\.models\.generateContent\(\{[\s\S]*?\}\);\s*\} catch \(apiErr\) \{[\s\S]*?\}\s*\}/g, `
                    let response;
                    try {
                        response = await client.models.generateContent({
                            model: modelName,
                            contents: typeof prompt !== 'undefined' ? prompt : chunkPrompt,
                            config: {
                                responseMimeType: "application/json",
                                responseSchema: responseSchema || {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            question: { type: Type.STRING },
                                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                            correctAnswer: { type: Type.STRING },
                                            explanation: { type: Type.STRING }
                                        },
                                        required: ["question", "options", "correctAnswer", "explanation"]
                                    }
                                },
                                temperature: typeof prompt !== 'undefined' ? 0.2 : 0.7,
                                maxOutputTokens: 8192
                            }
                        });
                    } catch (apiErr) {
                        const errStr = (apiErr.message || "").toLowerCase();
                        if (apiErr.status === 403 || apiErr.status === 404 || apiErr.status === 429 || errStr.includes('403') || errStr.includes('404') || errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('permission')) {
                            console.warn("Model " + modelName + " failed with quota/permission/404, falling back to gemini-3.6-flash", apiErr.message);
                            modelName = 'gemini-3.6-flash';
                            response = await client.models.generateContent({
                                model: modelName,
                                contents: typeof prompt !== 'undefined' ? prompt : chunkPrompt,
                                config: {
                                    responseMimeType: "application/json",
                                    responseSchema: responseSchema || {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                question: { type: Type.STRING },
                                                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                                correctAnswer: { type: Type.STRING },
                                                explanation: { type: Type.STRING }
                                            },
                                            required: ["question", "options", "correctAnswer", "explanation"]
                                        }
                                    },
                                    temperature: typeof prompt !== 'undefined' ? 0.2 : 0.7,
                                    maxOutputTokens: 8192
                                }
                            });
                        } else {
                            throw apiErr;
                        }
                    }
`);

fs.writeFileSync(path, code);
