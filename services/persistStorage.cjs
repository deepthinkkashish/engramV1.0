const fs = require('fs');

const path = 'services/storage.ts';
let code = fs.readFileSync(path, 'utf8');

const persistFunction = `
export const requestPersistentStorage = async () => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        try {
            const isPersisted = await navigator.storage.persisted();
            if (!isPersisted) {
                await navigator.storage.persist();
                console.log("[Storage] Requested persistent storage.");
            }
        } catch (e) {
            console.warn("[Storage] Could not request persistent storage", e);
        }
    }
};
`;

code = code.replace('export const initStorage =', persistFunction + '\nexport const initStorage =');

fs.writeFileSync(path, code);
