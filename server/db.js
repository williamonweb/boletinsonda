import { neon } from '@neondatabase/serverless';

let initialized;

function connection() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada');
  return neon(process.env.DATABASE_URL);
}

export async function database() {
  const sql = connection();
  initialized ||= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS boletins (
      id TEXT PRIMARY KEY,
      paciente TEXT NOT NULL,
      tutor TEXT NOT NULL,
      especie TEXT NOT NULL CHECK (especie IN ('canina', 'felina')),
      periodo TEXT NOT NULL CHECK (periodo IN ('manha', 'tarde')),
      data_boletim DATE,
      horario TEXT,
      veterinario TEXT,
      responsavel TEXT NOT NULL,
      dados JSONB NOT NULL DEFAULT '{}'::jsonb,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS boletins_data_idx ON boletins (data_boletim DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS boletins_responsavel_idx ON boletins (responsavel)`;
  })();
  await initialized;
  return sql;
}
