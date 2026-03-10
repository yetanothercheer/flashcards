import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { pool } from "@/lib/db";
import { parseCSV } from "@/lib/csv";

type Params = { params: Promise<{ deckId: string }> };

/**
 * POST /api/decks/[deckId]/import
 * POST /api/decks/new/import          ← create deck on-the-fly
 *
 * Accepts multipart/form-data:
 *   file  — CSV file (front, back, example?)
 *   name  — deck name (required when deckId === "new")
 *   description — optional deck description (only used when deckId === "new")
 */
export async function POST(req: NextRequest, { params }: Params) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const { deckId } = await params;
    const isNew = deckId === "new";

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return Response.json({ error: "请上传 CSV 文件" }, { status: 400 });
    }
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
        return Response.json({ error: "文件必须是 CSV 格式" }, { status: 400 });
    }

    // For new-deck creation, validate the name field up-front
    let deckName: string | null = null;
    let deckDescription: string | null = null;
    if (isNew) {
        deckName = (formData.get("name") as string | null)?.trim() || null;
        if (!deckName) {
            return Response.json(
                { error: "创建词书时必须提供名称（name 字段）" },
                { status: 400 }
            );
        }
        deckDescription =
            (formData.get("description") as string | null)?.trim() || null;
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

        // ------------------------------------------------------------------
        // Resolve the target deck id (create if deckId === "new")
        // ------------------------------------------------------------------
        let resolvedDeckId: string;

        if (isNew) {
            const deckResult = await client.query<{ id: string }>(
                `INSERT INTO decks (user_id, name, description)
                 VALUES ($1, $2, $3)
                 RETURNING id`,
                [auth.userId, deckName, deckDescription]
            );
            resolvedDeckId = deckResult.rows[0].id;
        } else {
            // Verify ownership of existing deck
            const ownerCheck = await client.query(
                "SELECT id FROM decks WHERE id = $1 AND user_id = $2",
                [deckId, auth.userId]
            );
            if ((ownerCheck.rowCount ?? 0) === 0) {
                await client.query("ROLLBACK");
                return Response.json({ error: "词书不存在" }, { status: 404 });
            }
            resolvedDeckId = deckId;
        }

        // ------------------------------------------------------------------
        // Determine starting position
        // ------------------------------------------------------------------
        const posResult = await client.query<{ max: number | null }>(
            "SELECT MAX(position) AS max FROM cards WHERE deck_id = $1",
            [resolvedDeckId]
        );
        let position = (posResult.rows[0].max ?? -1) + 1;

        // ------------------------------------------------------------------
        // Batch INSERT — single round-trip regardless of card count
        // Build: INSERT INTO cards (deck_id, front, back, example, position)
        //        VALUES ($1,$2,$3,$4,$5), ($6,$7,$8,$9,$10), ...
        // ------------------------------------------------------------------
        const valuePlaceholders: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        for (const card of cards) {
            valuePlaceholders.push(
                `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
            );
            values.push(
                resolvedDeckId,
                card.front,
                card.back,
                card.example ?? null,
                position++
            );
        }

        await client.query(
            `INSERT INTO cards (deck_id, front, back, example, position)
             VALUES ${valuePlaceholders.join(", ")}`,
            values
        );

        await client.query("COMMIT");

        const response: Record<string, unknown> = { imported: cards.length, errors };
        if (isNew) response.deck_id = resolvedDeckId;

        return Response.json(response, { status: isNew ? 201 : 200 });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Import error:", err);
        return Response.json({ error: "导入失败，请重试" }, { status: 500 });
    } finally {
        client.release();
    }
}
