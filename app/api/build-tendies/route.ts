import { NextRequest } from "next/server";
import JSZip from "jszip";
import plist from "plist";

export const runtime = "edge"; // fuck you edge

export async function POST(req: NextRequest) {
  try {
    const caArrayBuffer = await req.arrayBuffer();
    const caBuffer = new Uint8Array(caArrayBuffer);

    const { searchParams } = new URL(req.url);
    const requestedFilename = searchParams.get("filename");
    const caFilename =
      (requestedFilename && requestedFilename.trim()) || "project.ca";

    const templateZipUrl = new URL(
      "/lib/templates/tendies.zip",
      req.url
    ).toString();
    const templateRes = await fetch(templateZipUrl);
    if (!templateRes.ok) {
      return new Response(
        JSON.stringify({ error: "Template zip not found" }),
        { status: 500 }
      );
    }
    const templateZipData = await templateRes.arrayBuffer();

    const zip = await JSZip.loadAsync(templateZipData);

    const internalDir = //i keep same
      "descriptors/09E9B685-7456-4856-9C10-47DF26B76C33/versions/0/contents/7400.WWDC_2022-390w-844h@3x~iphone.wallpaper/";

    zip.file(internalDir + caFilename, caBuffer);
    
    const plistPath = internalDir + "Wallpaper.plist";
    const plistFile = zip.file(plistPath);

    if (plistFile) {
      try {
        const rawText = await plistFile.async("text");

        let updatedBuffer: Uint8Array | null = null;
        try {
          const parsed = plist.parse(rawText) as any;
          if (parsed && parsed.assets?.lockAndHome?.default) {
            parsed.assets.lockAndHome.default.foregroundAnimationFileName =
              caFilename;
            const created = plist.build(parsed);
            updatedBuffer = new TextEncoder().encode(created);
          }
        } catch {
          const replaced = rawText.replace(
            /(<key>foregroundAnimationFileName<\/key>\s*<string>)([^<]*)(<\/string>)/,
            `$1${caFilename}$3`
          );
          updatedBuffer = new TextEncoder().encode(replaced);
        }

        if (updatedBuffer) {
          zip.file(plistPath, updatedBuffer);
        }
      } catch { return;}
    }

    const output = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });

    return new Response(output, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="tendies.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to build zip" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
