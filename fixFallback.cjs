const fs = require('fs');
const path = 'services/testSeriesService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/const response = await client\.models\.generateContent\(\{([\s\S]*?)model: modelName,([\s\S]*?)\}\);/g, `
                    let response;
                    try {
                        response = await client.models.generateContent({$1model: modelName,$2});
                    } catch (apiErr) {
                        if (apiErr.status === 403 || apiErr.status === 404 || (apiErr.message && (apiErr.message.includes('403') || apiErr.message.includes('404')))) {
                            console.warn("Model " + modelName + " failed with 403/404, falling back to gemini-3.5-flash", apiErr);
                            modelName = 'gemini-3.5-flash';
                            response = await client.models.generateContent({$1model: modelName,$2});
                        } else {
                            throw apiErr;
                        }
                    }
`);

fs.writeFileSync(path, code);
