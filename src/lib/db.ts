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

/** Convenience query wrapper */
export async function query<T extends object = Record<string, unknown>>(
    text: string,
    params?: unknown[]
) {
    const result = await pool.query<T>(text, params);
    return result;
}
