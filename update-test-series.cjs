const fs = require('fs');

const path = 'services/testSeriesService.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /const responseSchema: Schema = \{[\s\S]*?\};\s*try\s*\{\s*const response = await client\.models\.generateContent\(\{[\s\S]*?\}\s*\);\s*incrementUsage\(\);\s*const text = response\.text;\s*if \(\!text\) throw new Error\("Empty response from Gemini"\);\s*const parsed = safeParseJSON\(text\);\s*const rawQuestions = parsed\.questions \|\| parsed;\s*const questionsArray = Array\.isArray\(rawQuestions\) \? rawQuestions : \[\];\s*\/\/ Filter out any truncated or malformed questions\s*return questionsArray\.filter\(\(q: any\) =>\s*q &&\s*q\.question &&\s*Array\.isArray\(q\.options\) &&\s*q\.options\.length > 0 &&\s*q\.correctAnswer\s*\);\s*\} catch \(error\) \{/m;

const replacement = `
    const CHUNK_SIZE = 5;
    const numChunks = Math.ceil(numQuestions / CHUNK_SIZE);
    let allQuestions: TestSeriesQuestion[] = [];

    try {
        const promises = [];
        for (let i = 0; i < numChunks; i++) {
            const chunkAmount = (i === numChunks - 1 && numQuestions % CHUNK_SIZE !== 0) ? numQuestions % CHUNK_SIZE : CHUNK_SIZE;
            
            const chunkPrompt = prompt.replace(
                new RegExp(\`EXACTLY \\\$\{numQuestions\}\`, 'g'),
                \`EXACTLY \${chunkAmount}\`
            ).replace(
                new RegExp(\`exactly \\\$\{numQuestions\}\`, 'g'),
                \`exactly \${chunkAmount}\`
            );

            promises.push(client.models.generateContent({
                model: modelName,
                contents: chunkPrompt,
                config: {
                    responseMimeType: "application/json",
                    temperature: 0.7,
                    maxOutputTokens: 8192
                }
            }).then(response => {
                incrementUsage();
                const text = response.text;
                if (!text) return [];
                
                try {
                    const parsed = safeParseJSON(text);
                    const rawQuestions = parsed.questions || parsed;
                    return Array.isArray(rawQuestions) ? rawQuestions : [];
                } catch(e) {
                    console.error("Chunk parse error:", e);
                    return [];
                }
            }));
        }

        const chunkResults = await Promise.all(promises);
        
        for (const chunk of chunkResults) {
            const validQuestions = chunk.filter((q: any) => 
                q && 
                q.question && 
                Array.isArray(q.options) && 
                q.options.length > 0 &&
                q.correctAnswer
            );
            allQuestions = allQuestions.concat(validQuestions);
        }
        
        // Trim to exact requested amount just in case
        return allQuestions.slice(0, numQuestions);
    } catch (error) {`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
console.log("File updated");
