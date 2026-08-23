const fs = require('fs');

function enhanceFallback(path) {
    if (!fs.existsSync(path)) return;
    let code = fs.readFileSync(path, 'utf8');
    
    // Replace the specific catch block I inserted earlier
    code = code.replace(/if \(apiErr\.status === 403[\s\S]*?else \{/g, `
                        const errStr = (apiErr.message || "").toLowerCase();
                        if (apiErr.status === 403 || apiErr.status === 404 || apiErr.status === 429 || errStr.includes('403') || errStr.includes('404') || errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('permission')) {
                            console.warn("Model " + modelName + " failed with quota/permission/404, falling back to gemini-3.6-flash", apiErr);
                            modelName = 'gemini-3.6-flash';
    `);
    
    fs.writeFileSync(path, code);
}

enhanceFallback('services/testSeriesService.ts');
