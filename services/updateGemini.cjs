const fs = require('fs');

const path = 'services/gemini.ts';
let code = fs.readFileSync(path, 'utf8');

const getAvailableModelsStart = 'export const getAvailableModels = async (): Promise<{id: string, label: string}[]> => {';
const getAvailableModelsEndRegex = /return fallbackModels;\n    \} catch \(e\) \{\n        console\.error\("Failed to fetch models", e\);\n        return fallbackModels;\n    \}\n\};/g;

// Instead of doing complex regex for getAvailableModels, we can just replace the whole function if we know it.
code = code.replace(/export const getAvailableModels = async \(\): Promise<\{id: string, label: string\}\[\]> => \{[\s\S]*?return fallbackModels;\n    \}\n\};/, `export const getAvailableModels = async (): Promise<{id: string, label: string}[]> => {
    // Curated list of models available under generous free limits
    return [
        { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (Advanced & Recommended)' },
        { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (Latest & Fastest)' },
        { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite (Ultra-fast)' },
        { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview (Deep Reasoning)' }
    ];
};`);

code = code.replace(/export const resolveModelName = \([\s\S]*?return prefsModel;\n\};/, `export const resolveModelName = (prefsModel?: string, featureId?: string): string => {
    if (!prefsModel) {
        if (featureId === 'ocr') return 'gemini-3.6-flash';
        if (featureId === 'testSeries') return 'gemini-3.6-flash';
        return 'gemini-3.6-flash';
    }
    if (prefsModel === 'flash') return 'gemini-3.6-flash';
    if (prefsModel === 'pro') return 'gemini-3.1-pro-preview';
    
    // Auto-upgrade legacy models to prevent 404s and quota crashes
    if (prefsModel.includes('1.5') || prefsModel.includes('2.0') || prefsModel.includes('2.5') || prefsModel.includes('3.0') || prefsModel === 'gemini-3-flash-preview' || prefsModel.includes('omni-flash')) {
        return 'gemini-3.6-flash';
    }
    
    return prefsModel;
};`);

fs.writeFileSync(path, code);
console.log('Updated services/gemini.ts');
