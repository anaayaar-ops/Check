// diagnose.js
import fs from 'fs';
import path from 'path';

const searchDir = 'node_modules/wolf.js';
const results = [];

function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules') continue; // تجاهل التبعيات الفرعية
            walk(fullPath);
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.d.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (/event/i.test(entry.name) || /group event|audit/i.test(content)) {
                results.push(fullPath);
            }
        }
    }
}

walk(searchDir);

console.log(`📂 ملفات محتملة الصلة (${results.length}):`);
results.forEach(f => console.log('  -', f));

console.log('\n🔎 البحث عن أوامر websocket المتعلقة بـ event / audit:\n');

for (const file of results) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (/['"`](group\s?(event|audit)[a-zA-Z\s]*)['"`]/i.test(line)) {
            console.log(`${file}:${i + 1}`);
            console.log(`  ${line.trim()}`);
        }
    });
}
