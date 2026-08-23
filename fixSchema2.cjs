const fs = require('fs');
const path = 'services/testSeriesService.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /maxOutputTokens: 8192\s+\}/m;
const replacement = `maxOutputTokens: 8192,
                            responseSchema: {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        question: { type: "STRING" },
                                        options: { type: "ARRAY", items: { type: "STRING" } },
                                        correctAnswer: { type: "STRING" },
                                        explanation: { type: "STRING" }
                                    },
                                    required: ["question", "options", "correctAnswer", "explanation"]
                                }
                            }
                        }`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
