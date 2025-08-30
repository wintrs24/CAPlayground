import EditorPageClient from "@/components/editor/editor-page-client";
import path from 'path';
import fs from 'fs';

export async function generateStaticParams() {
  try {
    const templatesDir = path.join(process.cwd(), 'lib', 'templates');
    const templateFiles = await fs.promises.readdir(templatesDir);
    const ids = templateFiles
      .filter((file) => path.extname(file) === '.zip')
      .map((file) => path.basename(file, '.zip'));
    return ids.map((id) => ({ id }));
  } catch (error) {
    console.error('Failed to generate static params:', error);
    return [] as Array<{ id: string }>;
  }
}

export const dynamicParams = true;

export default function EditorPage() {
  return <EditorPageClient />;
}
