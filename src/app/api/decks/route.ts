import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

// GET /api/decks — list user's decks with card count and due count
export async function GET(req: NextRequest) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const result = await query(
        `SELECT
       d.id, d.name, d.description, d.is_public, d.source_deck_id,
       d.share_token, d.created_at, d.updated_at,
       COUNT(DISTINCT c.id)::int AS card_count,
       COUNT(DISTINCT sr.id) FILTER (
         WHERE sr.next_review_at <= NOW()
       )::int AS due_count
     FROM decks d
     LEFT JOIN cards c ON c.deck_id = d.id
     LEFT JOIN study_records sr ON sr.card_id = c.id AND sr.user_id = $1
     WHERE d.user_id = $1 AND d.is_builtin = FALSE
     GROUP BY d.id
     ORDER BY d.created_at DESC`,
        [auth.userId]
    );

    return Response.json(result.rows);
}

// POST /api/decks — create a new deck
const CreateDeckSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    is_public: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const body = await req.json();
    const parsed = CreateDeckSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, description, is_public } = parsed.data;

    const result = await query(
        `INSERT INTO decks (user_id, name, description, is_public)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, description, is_public, share_token, created_at`,
        [auth.userId, name, description ?? null, is_public]
    );

    return Response.json(result.rows[0], { status: 201 });
}
