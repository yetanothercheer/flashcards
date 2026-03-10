import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
}

// Reuse pool across hot reloads in development
const globalForPg = global as unknown as { pgPool: Pool };

export const pool =
    globalForPg.pgPool ??
    new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
    });

if (process.env.NODE_ENV !== "production") {
    globalForPg.pgPool = pool;
}

/** Convenience query wrapper with timing logs */
export async function query<T extends object = Record<string, unknown>>(
    text: string,
    params?: unknown[]
) {
    const start = performance.now();
    const result = await pool.query<T>(text, params);
    const elapsed = (performance.now() - start).toFixed(2);
    console.log(
        `[db] ${elapsed}ms | rows=${result.rowCount ?? 0} | ${text.replace(/\s+/g, " ").trim().slice(0, 100)}`
    );
    return result;
}
