const fs = require('fs');
const path = 'services/gemini.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/if \(e && typeof e === 'object' && \(e\.status === 404 \|\| \(e\.message && \(e\.message\.includes\('not found'\) \|\| e\.message\.includes\('no longer available'\)\)\)\)\) \{[\s\S]*?throw new Error[\s\S]*?\}\s*if \(e && typeof e === 'object' && 'status' in e && e\.status === 429\) \{/m,
`
            const errStr = (e.message || "").toLowerCase();
            if (e && typeof e === 'object' && (e.status === 404 || errStr.includes('not found') || errStr.includes('no longer available'))) {
                // If it's a 404, we can optionally fallback, but the existing code threw.
                // Let's fallback to 3.6-flash here as well to prevent total failure
                if (modelName !== 'gemini-3.6-flash') {
                    console.warn("Model " + modelName + " not found (404), falling back to gemini-3.6-flash");
                    modelName = 'gemini-3.6-flash';
                    continue; // Retry with new model
                } else {
                    throw new Error("The selected AI model is deprecated or no longer available.");
                }
            }
            
            if (e && typeof e === 'object' && (e.status === 403 || e.status === 429 || errStr.includes('403') || errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('permission'))) {
                if (modelName !== 'gemini-3.6-flash') {
                    console.warn("Model " + modelName + " hit quota/permission limit, falling back to gemini-3.6-flash", errStr);
                    modelName = 'gemini-3.6-flash';
                    continue; // Retry with new model
                }
                
                // Rate limit, wait if we're already on 3.6-flash
                if (e.status === 429 || errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted')) {
                    await new Promise(r => setTimeout(r, 2000 * (i + 1)));
                    continue;
                }
            }
`);

fs.writeFileSync(path, code);
