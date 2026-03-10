import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { query, pool } from "@/lib/db";
import { parseCSV } from "@/lib/csv";

type Params = { params: Promise<{ deckId: string }> };

/**
 * POST /api/decks/[deckId]/import
 * Accepts multipart/form-data with a CSV file.
 * CSV format: front, back, example (optional)
 */
export async function POST(req: NextRequest, { params }: Params) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const { deckId } = await params;

    // Verify ownership
    const ownerCheck = await query(
        "SELECT id FROM decks WHERE id = $1 AND user_id = $2",
        [deckId, auth.userId]
    );
    if ((ownerCheck.rowCount ?? 0) === 0) {
        return Response.json({ error: "词书不存在" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return Response.json({ error: "请上传 CSV 文件" }, { status: 400 });
    }

    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
        return Response.json({ error: "文件必须是 CSV 格式" }, { status: 400 });
    }

    const text = await file.text();
    const { cards, errors } = parseCSV(text);

    if (cards.length === 0) {
        return Response.json(
            { error: "CSV 中没有有效数据", parse_errors: errors },
            { status: 400 }
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Get current max position
        const posResult = await client.query<{ max: number | null }>(
            "SELECT MAX(position) AS max FROM cards WHERE deck_id = $1",
            [deckId]
        );
        let position = (posResult.rows[0].max ?? -1) + 1;

        for (const card of cards) {
            await client.query(
                `INSERT INTO cards (deck_id, front, back, example, position)
         VALUES ($1, $2, $3, $4, $5)`,
                [deckId, card.front, card.back, card.example ?? null, position++]
            );
        }

        await client.query("COMMIT");

        return Response.json({
            imported: cards.length,
            errors,
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Import error:", err);
        return Response.json({ error: "导入失败，请重试" }, { status: 500 });
    } finally {
        client.release();
    }
}
