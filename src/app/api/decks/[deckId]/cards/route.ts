import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ deckId: string }> };

// Helper: assert ownership
async function assertOwner(deckId: string, userId: string) {
    const r = await query("SELECT id FROM decks WHERE id = $1 AND user_id = $2", [deckId, userId]);
    return (r.rowCount ?? 0) > 0;
}

// GET /api/decks/[deckId]/cards?page=1&limit=50
export async function GET(req: NextRequest, { params }: Params) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const { deckId } = await params;
    if (!(await assertOwner(deckId, auth.userId))) {
        return Response.json({ error: "词书不存在" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const offset = (page - 1) * limit;

    const [cardsResult, countResult] = await Promise.all([
        query(
            `SELECT id, front, back, example, phonetic, part_of_speech, position, created_at
       FROM cards
       WHERE deck_id = $1
       ORDER BY position ASC, created_at ASC
       LIMIT $2 OFFSET $3`,
            [deckId, limit, offset]
        ),
        query<{ total: number }>(
            "SELECT COUNT(*)::int AS total FROM cards WHERE deck_id = $1",
            [deckId]
        ),
    ]);

    const total = countResult.rows[0].total;

    return Response.json({
        cards: cardsResult.rows,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
        },
    });
}

// POST /api/decks/[deckId]/cards — add a single card
const CreateCardSchema = z.object({
    front: z.string().min(1),
    back: z.string().min(1),
    example: z.string().optional(),
    phonetic: z.string().optional(),
    part_of_speech: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const { deckId } = await params;
    if (!(await assertOwner(deckId, auth.userId))) {
        return Response.json({ error: "词书不存在" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = CreateCardSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { front, back, example, phonetic, part_of_speech } = parsed.data;

    // Append to end
    const posResult = await query<{ max: number | null }>(
        "SELECT MAX(position) AS max FROM cards WHERE deck_id = $1",
        [deckId]
    );
    const position = (posResult.rows[0].max ?? -1) + 1;

    const result = await query(
        `INSERT INTO cards (deck_id, front, back, example, phonetic, part_of_speech, position)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
        [deckId, front, back, example ?? null, phonetic ?? null, part_of_speech ?? null, position]
    );

    return Response.json(result.rows[0], { status: 201 });
}
