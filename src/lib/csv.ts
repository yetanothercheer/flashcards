/**
 * CSV parser for card import.
 * Format: front, back, example (optional)
 * - Auto-skips blank lines
 * - Auto-skips header row if first row looks like a header
 * - Supports quoted fields (handles commas inside quotes)
 * - Returns successfully parsed cards + per-row errors
 */

export interface ParsedCard {
    front: string;
    back: string;
    example?: string;
}

export interface ParseResult {
    cards: ParsedCard[];
    errors: Array<{ row: number; reason: string }>;
}

function parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === "," && !inQuotes) {
            fields.push(current.trim());
            current = "";
        } else {
            current += ch;
        }
    }
    fields.push(current.trim());
    return fields;
}

const HEADER_PATTERNS = /^(front|word|term|单词)/i;

export function parseCSV(csvText: string): ParseResult {
    const lines = csvText.split(/\r?\n/);
    const cards: ParsedCard[] = [];
    const errors: Array<{ row: number; reason: string }> = [];

    let startRow = 0;

    // Skip header row if detected
    if (lines.length > 0 && HEADER_PATTERNS.test(lines[0].split(",")[0])) {
        startRow = 1;
    }

    for (let i = startRow; i < lines.length; i++) {
        const line = lines[i].trim();
        const rowNum = i + 1;

        if (!line) continue; // skip blank lines

        const fields = parseCSVLine(line);

        if (fields.length < 2) {
            errors.push({ row: rowNum, reason: "需要至少 2 列（单词, 释义）" });
            continue;
        }

        const [front, back, example] = fields;

        if (!front) {
            errors.push({ row: rowNum, reason: "单词（第 1 列）不能为空" });
            continue;
        }
        if (!back) {
            errors.push({ row: rowNum, reason: "释义（第 2 列）不能为空" });
            continue;
        }

        cards.push({
            front,
            back,
            example: example || undefined,
        });
    }

    return { cards, errors };
}
