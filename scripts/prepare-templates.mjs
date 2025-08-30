import fs from 'fs/promises';
import path from 'path';
import { unpackCA } from '../lib/ca/ca-file.js';

const templatesDir = path.join(process.cwd(), 'lib', 'templates');
const outputDir = path.join(process.cwd(), 'public', 'templates');

async function prepareTemplates() {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    const templateFiles = await fs.readdir(templatesDir);

    for (const file of templateFiles) {
      if (path.extname(file) === '.zip') {
        const id = path.basename(file, '.zip');
        const filePath = path.join(templatesDir, file);
        const fileBuffer = await fs.readFile(filePath);
        const projectData = await unpackCA(new Blob([fileBuffer]));
        
        const outputPath = path.join(outputDir, `${id}.json`);
        await fs.writeFile(outputPath, JSON.stringify(projectData, null, 2));
        console.log(`Prepared template: ${id}.json`);
      }
    }
    console.log('All templates prepared successfully.');
  } catch (error) {
    console.error('Failed to prepare templates:', error);
    process.exit(1);
  }
}

prepareTemplates();
