import { generateExamQuiz } from './services/testSeriesService';

(globalThis as any).localStorage = {
    getItem: () => null,
    setItem: () => {}
};

async function run() {
    try {
        const questions = await generateExamQuiz("Bank PO", "General", "Reasoning Ability", "Hard", 10, [], "Round table");
        console.log("Returned questions length:", questions.length);
    } catch (e) {
        console.error(e);
    }
}
run();
