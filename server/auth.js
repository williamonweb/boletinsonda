import crypto from 'node:crypto';

const COOKIE_NAME = 'onda_admin';

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function secret() {
  return process.env.SESSION_SECRET || '';
}

function signature(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

export function credentialsConfigured() {
  return Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD && secret().length >= 24);
}

export function validateCredentials(user, password) {
  if (!credentialsConfigured()) return false;
  return safeEqual(user, process.env.ADMIN_USER) && safeEqual(password, process.env.ADMIN_PASSWORD);
}

export function createSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(item => item.trim().split('=').map(decodeURIComponent)).filter(pair => pair.length === 2));
}

export function isAdmin(req) {
  if (!credentialsConfigured()) return false;
  const token = cookies(req)[COOKIE_NAME];
  if (!token) return false;
  const [payload, sentSignature] = token.split('.');
  if (!payload || !sentSignature || !safeEqual(sentSignature, signature(payload))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${8 * 60 * 60}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
