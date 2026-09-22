import { createSession, credentialsConfigured, sessionCookie, validateCredentials } from '../../server/auth.js';
import { json, readBody } from '../../server/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido' });
  if (!credentialsConfigured()) return json(res, 503, { error: 'O acesso administrativo ainda não foi configurado na Vercel.' });
  const body = await readBody(req);
  if (!body) return json(res, 400, { error: 'Dados inválidos' });
  if (!validateCredentials(body.user || '', body.password || '')) return json(res, 401, { error: 'Usuário ou senha incorretos.' });
  res.setHeader('Set-Cookie', sessionCookie(createSession()));
  return json(res, 200, { ok: true, user: process.env.ADMIN_USER });
}
