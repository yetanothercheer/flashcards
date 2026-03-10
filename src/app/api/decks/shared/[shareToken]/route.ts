import { NextRequest } from "next/server";
import { query } from "@/lib/db";

type Params = { params: Promise<{ shareToken: string }> };

/**
 * GET /api/decks/shared/[shareToken]
 * Public endpoint — no auth required.
 * Returns deck info + first page of cards.
 */
export async function GET(_req: NextRequest, { params }: Params) {
    const { shareToken } = await params;

    const deckResult = await query(
        `SELECT d.id, d.name, d.description, d.is_public, d.created_at,
            u.display_name AS author_name,
            COUNT(c.id)::int AS card_count
     FROM decks d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN cards c ON c.deck_id = d.id
     WHERE d.share_token = $1
     GROUP BY d.id, u.display_name`,
        [shareToken]
    );

    if (!deckResult.rows[0]) {
        return Response.json({ error: "词书不存在" }, { status: 404 });
    }

    const deck = deckResult.rows[0];

    // Return preview cards (first 10)
    const previewCards = await query(
        `SELECT front, back, example, phonetic, part_of_speech
     FROM cards WHERE deck_id = $1
     ORDER BY position ASC LIMIT 10`,
        [deck.id]
    );

    return Response.json({
        ...deck,
        preview_cards: previewCards.rows,
    });
}
