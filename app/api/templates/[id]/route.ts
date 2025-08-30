import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { unpackCA } from "@/lib/ca/ca-file";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const templatesDir = path.join(process.cwd(), "lib", "templates");
    const filePath = path.join(templatesDir, `${id}.zip`);

    if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(filePath);
    const projectData = await unpackCA(new Blob([fileBuffer]));

    return NextResponse.json(projectData);
  } catch (error) {
    console.error(`Failed to load template ${id}:`, error);
    return NextResponse.json({ error: "Failed to load template" }, { status: 500 });
  }
}
