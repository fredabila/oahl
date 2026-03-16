import fs from 'node:fs';
import path from 'node:path';

const adaptersDir = 'registry/adapters';
const outputFile = 'registry/registry.json';

const adapters = [];

const files = fs.readdirSync(adaptersDir);
for (const file of files) {
  if (file.endsWith('.json')) {
    const filePath = path.join(adaptersDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    adapters.push(content);
  }
}

fs.writeFileSync(outputFile, JSON.stringify(adapters, null, 2), 'utf8');
console.log(`Generated ${outputFile} with ${adapters.length} adapters.`);
