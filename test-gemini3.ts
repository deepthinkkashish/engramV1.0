import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    try {
        const chat = ai.chats.create({
            model: 'gemini-3.5-flash',
            history: [{ role: 'user', parts: [{text: 'Hello'}]}, { role: 'user', parts: [{text: 'Hi'}] }]
        });
        const res = await chat.sendMessage({ message: 'Hi' });
        console.log("SUCCESS:", res.text);
    } catch (e) {
        console.error("ERROR:", e.message);
    }
}
run();
