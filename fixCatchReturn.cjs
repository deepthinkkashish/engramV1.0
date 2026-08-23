const fs = require('fs');
const path = 'context/ProcessingContext.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/updateJob\(jobId, \{\n                status: 'error',\n                message: errorMessage\n            \}\);\n        \} finally \{/m, `updateJob(jobId, {
                status: 'error',
                message: errorMessage
            });
            return null;
        } finally {`);

fs.writeFileSync(path, code);
