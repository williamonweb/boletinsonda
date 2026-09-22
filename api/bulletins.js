import { database } from '../server/db.js';
import { isAdmin } from '../server/auth.js';
import { json, readBody } from '../server/http.js';

const clean = (value, max = 180) => String(value ?? '').trim().slice(0, max);

function rowToBulletin(row) {
  return {
    id: row.id,
    recordId: row.id,
    species: row.especie,
    shift: row.periodo,
    responsavel: row.responsavel,
    data: row.dados || {},
    createdAt: row.criado_em,
    updatedAt: row.atualizado_em
  };
}

export default async function handler(req, res) {
  try {
    const sql = await database();
    if (req.method === 'POST') {
      const body = await readBody(req);
      if (!body) return json(res, 400, { error: 'Dados inválidos' });
      const data = body.data && typeof body.data === 'object' ? body.data : {};
      const id = clean(body.id || body.recordId, 80);
      const paciente = clean(data.paciente);
      const tutor = clean(data.tutor);
      const responsavel = clean(body.responsavel);
      const especie = body.species === 'felina' ? 'felina' : 'canina';
      const periodo = body.shift === 'tarde' ? 'tarde' : 'manha';
      if (!id || !paciente || !tutor || !responsavel) return json(res, 400, { error: 'Animal, tutor e responsável são obrigatórios.' });
      const safeData = { ...data, paciente, tutor, veterinario: clean(data.veterinario), horario: clean(data.horario, 10), data: clean(data.data, 10), observacoes: clean(data.observacoes, 1200) };
      const rows = await sql`INSERT INTO boletins (id, paciente, tutor, especie, periodo, data_boletim, horario, veterinario, responsavel, dados)
        VALUES (${id}, ${paciente}, ${tutor}, ${especie}, ${periodo}, ${safeData.data || null}, ${safeData.horario || null}, ${safeData.veterinario || null}, ${responsavel}, ${JSON.stringify(safeData)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET paciente = EXCLUDED.paciente, tutor = EXCLUDED.tutor, especie = EXCLUDED.especie,
          periodo = EXCLUDED.periodo, data_boletim = EXCLUDED.data_boletim, horario = EXCLUDED.horario,
          veterinario = EXCLUDED.veterinario, responsavel = EXCLUDED.responsavel, dados = EXCLUDED.dados, atualizado_em = NOW()
        RETURNING *`;
      return json(res, 200, { ok: true, bulletin: rowToBulletin(rows[0]) });
    }
    if (!isAdmin(req)) return json(res, 401, { error: 'Acesso administrativo necessário.' });
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM boletins ORDER BY atualizado_em DESC LIMIT 1000`;
      return json(res, 200, { bulletins: rows.map(rowToBulletin) });
    }
    if (req.method === 'DELETE') {
      const body = await readBody(req);
      const id = clean(body?.id, 80);
      if (!id) return json(res, 400, { error: 'Boletim não informado.' });
      await sql`DELETE FROM boletins WHERE id = ${id}`;
      return json(res, 200, { ok: true });
    }
    return json(res, 405, { error: 'Método não permitido' });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'Não foi possível acessar os boletins. Confira a configuração do Neon.' });
  }
}
