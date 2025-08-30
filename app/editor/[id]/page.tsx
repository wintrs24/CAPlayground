import EditorPageClient from "@/components/editor/editor-page-client";

export function generateStaticParams() {
  return [] as Array<{ id: string }>
}

export default function EditorPage() {
  return <EditorPageClient />;
}
