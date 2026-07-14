import { env } from "cloudflare:workers";

function bucket() {
  const value = (env as unknown as { ASSETS?: R2Bucket }).ASSETS;
  if (!value) throw new Error("Upload storage is unavailable");
  return value;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/")) return Response.json({ error: "Image file required" }, { status: 400 });
    if (file.size > 6_000_000) return Response.json({ error: "Image must be under 6MB" }, { status: 413 });
    const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "img";
    const key = `notes/${crypto.randomUUID()}.${extension}`;
    await bucket().put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" } });
    return Response.json({ url: `/api/uploads?key=${encodeURIComponent(key)}` }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if (!/^notes\/[a-z0-9-]+\.[a-z0-9]+$/i.test(key)) return new Response("Not found", { status: 404 });
    const object = await bucket().get(key);
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    return new Response(object.body, { headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
