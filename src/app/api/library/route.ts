import { NextRequest } from "next/server";
import { query } from "@/lib/db";

/**
 * GET /api/library
 * Returns all builtin and public decks (no auth required).
 */
export async function GET(_req: NextRequest) {
    const result = await query(
        `SELECT
       d.id, d.name, d.description, d.share_token, d.created_at,
       u.display_name AS author_name,
       COUNT(c.id)::int AS card_count
     FROM decks d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN cards c ON c.deck_id = d.id
     WHERE d.is_public = TRUE OR d.is_builtin = TRUE
     GROUP BY d.id, u.display_name
     ORDER BY d.is_builtin DESC, d.created_at DESC`
    );

    return Response.json(result.rows);
}
