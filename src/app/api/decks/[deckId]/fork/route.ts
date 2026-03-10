import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { query, pool } from "@/lib/db";

type Params = { params: Promise<{ deckId: string }> };

/**
 * POST /api/decks/[deckId]/fork
 * Deep-copies a public deck (or any deck accessible via share token) into
 * the current user's account. Source deck must be public or the user must
 * own it.
 */
export async function POST(req: NextRequest, { params }: Params) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const { deckId } = await params;

    // Source must be public (or owned by user)
    const sourceResult = await query(
        `SELECT id, name, description FROM decks
     WHERE id = $1 AND (is_public = TRUE OR user_id = $2)`,
        [deckId, auth.userId]
    );

    if (!sourceResult.rows[0]) {
        return Response.json({ error: "词书不存在或不公开" }, { status: 404 });
    }

    const source = sourceResult.rows[0];
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Create forked deck
        const newDeckResult = await client.query<{ id: string }>(
            `INSERT INTO decks (user_id, name, description, source_deck_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
            [auth.userId, source.name, source.description, deckId]
        );
        const newDeckId = newDeckResult.rows[0].id;

        // Copy all cards
        await client.query(
            `INSERT INTO cards (deck_id, front, back, example, phonetic, part_of_speech, position)
       SELECT $1, front, back, example, phonetic, part_of_speech, position
       FROM cards
       WHERE deck_id = $2`,
            [newDeckId, deckId]
        );

        await client.query("COMMIT");

        const cardCountResult = await query<{ count: string }>(
            "SELECT COUNT(*)::int AS count FROM cards WHERE deck_id = $1",
            [newDeckId]
        );

        return Response.json(
            {
                id: newDeckId,
                name: source.name,
                source_deck_id: deckId,
                card_count: cardCountResult.rows[0].count,
            },
            { status: 201 }
        );
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Fork error:", err);
        return Response.json({ error: "Fork 失败，请重试" }, { status: 500 });
    } finally {
        client.release();
    }
}
