const history = [
    { role: 'model', text: 'Hi!' },
    { role: 'user', text: 'Hello' },
    { role: 'user', text: 'How are you?' },
    { role: 'model', text: 'Good.' },
    { role: 'model', text: 'And you?' },
    { role: 'user', text: 'I am fine' }
];

const cleaned = [];
for (const h of history) {
    if (cleaned.length === 0) {
        if (h.role === 'user') {
            cleaned.push(h);
        }
    } else {
        const last = cleaned[cleaned.length - 1];
        if (last.role === h.role) {
            last.text += '\n' + h.text;
        } else {
            cleaned.push(h);
        }
    }
}
console.log(cleaned);
