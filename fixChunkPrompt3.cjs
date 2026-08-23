const fs = require('fs');
const path = 'services/testSeriesService.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /const prompt = \`You are an expert examiner[\s\S]*?const chunkPrompt = prompt\.replace\([\s\S]*?\);/m;
const replacement = `const CHUNK_SIZE = 5;
    const numChunks = Math.ceil(numQuestions / CHUNK_SIZE);
    let allQuestions: TestSeriesQuestion[] = [];

    try {
        for (let i = 0; i < numChunks; i++) {
            const chunkAmount = (i === numChunks - 1 && numQuestions % CHUNK_SIZE !== 0) ? numQuestions % CHUNK_SIZE : CHUNK_SIZE;
            
            const chunkPrompt = \`You are an expert examiner for the \${exam} exam (\${stream} stream).
Generate a practice test for \${subjectPrompt}.\${specificTopicsStr}\${languageStr}\${personaStr}
Difficulty level: \${diff}.
Number of questions: EXACTLY \${chunkAmount}. You MUST generate exactly \${chunkAmount} questions, no more, no less.

The questions should closely match the pattern, style, and syllabus of the actual \${exam} exam.
Include a mix of conceptual and numerical questions if applicable to the subject.
IMPORTANT: Keep the question text as concise as possible while maintaining the difficulty. Do not write overly long paragraphs.
\${pastContextStr}
Return the output strictly as a JSON array of exactly \${chunkAmount} objects. Each object must have:
- "question": The concise question text.
- "options": An array of exactly 4 string options.
- "correctAnswer": The exact string of the correct option.
- "explanation": A very concise, 1-2 sentence explanation of why the correct answer is correct.\`;`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
