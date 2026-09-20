import { readdir, readFile } from "node:fs/promises"
import pg from "pg"

const MIGRATIONS_DIR = new URL("../migrations/", import.meta.url)
// Arbitrary fixed key so concurrent deploys serialize on one runner.
const MIGRATION_LOCK_KEY = 727_001

/**
 * Applies server/migrations/*.sql in filename order. Runs as the app role
 * (which owns its database, so DDL is permitted) and fails boot on error —
 * a half-migrated schema must never serve traffic.
 */
export async function runMigrations(pool: pg.Pool): Promise<string[]> {
  const client = await pool.connect()
  try {
    await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK_KEY])
    await client.query(
      `create table if not exists "schema_migrations" (
        "name" text primary key,
        "applied_at" timestamptz not null default now()
      )`
    )

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((name) => name.endsWith(".sql"))
      .sort()

    const applied = new Set(
      (
        await client.query<{ name: string }>(
          'select "name" from "schema_migrations"'
        )
      ).rows.map((row) => row.name)
    )

    const ran: string[] = []
    for (const file of files) {
      if (applied.has(file)) continue
      const sql = await readFile(new URL(file, MIGRATIONS_DIR), "utf8")
      await client.query("begin")
      try {
        await client.query(sql)
        await client.query(
          'insert into "schema_migrations" ("name") values ($1)',
          [file]
        )
        await client.query("commit")
      } catch (error) {
        await client.query("rollback")
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`)
      }
      ran.push(file)
    }
    return ran
  } finally {
    try {
      await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY])
    } finally {
      client.release()
    }
  }
}
