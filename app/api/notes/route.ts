import { env } from "cloudflare:workers";

type NotePayload = { id: number; title: string; body: string; category: string; updated: string };
const keyPattern = /^[a-zA-Z0-9_-]{24,128}$/;

function database() {
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) throw new Error("D1 database is unavailable");
  return db;
}

export async function GET(request: Request) {
  try {
    const owner = new URL(request.url).searchParams.get("owner") ?? "";
    if (!keyPattern.test(owner)) return Response.json({ error: "Invalid workspace key" }, { status: 400 });
    const result = await database().prepare(
      "SELECT id, title, body, category, updated_at AS updated FROM study_notes WHERE owner_key = ? ORDER BY sort_order ASC, id DESC"
    ).bind(owner).all<NotePayload>();
    return Response.json({ notes: result.results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load notes" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as { owner?: string; notes?: NotePayload[] };
    const owner = payload.owner ?? "";
    const notes = Array.isArray(payload.notes) ? payload.notes.slice(0, 200) : [];
    if (!keyPattern.test(owner)) return Response.json({ error: "Invalid workspace key" }, { status: 400 });
    if (notes.some((note) => !Number.isSafeInteger(note.id) || !note.title?.trim() || note.body.length > 2_000_000)) {
      return Response.json({ error: "Invalid note data" }, { status: 400 });
    }
    const db = database();
    const statements = [db.prepare("DELETE FROM study_notes WHERE owner_key = ?").bind(owner)];
    notes.forEach((note, index) => statements.push(db.prepare(
      "INSERT INTO study_notes (id, owner_key, title, body, category, updated_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(note.id, owner, note.title.trim().slice(0, 160), note.body, note.category.slice(0, 80), note.updated, index)));
    await db.batch(statements);
    return Response.json({ saved: notes.length, savedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save notes" }, { status: 500 });
  }
}
