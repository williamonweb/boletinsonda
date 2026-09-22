import { credentialsConfigured, isAdmin } from '../../server/auth.js';
import { json } from '../../server/http.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido' });
  return json(res, 200, { authenticated: isAdmin(req), configured: credentialsConfigured() });
}
