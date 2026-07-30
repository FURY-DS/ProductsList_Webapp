/* =====================================================
   _lib/auth.js - 공통 인증 유틸리티
   PBKDF2 비밀번호 해싱, 세션 관리, CORS 헬퍼

   KV 구조:
   user:<username>    → { username, salt, hash, createdAt }
   session:<token>    → { username, createdAt }  (TTL 30일)
   data:<username>    → { data, ts }
   ===================================================== */

const SESSION_TTL = 30 * 24 * 60 * 60; // 30일 (초)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

/** JSON 응답 (CORS 포함) */
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/** CORS preflight 응답 */
export function handleOptions() {
  return new Response(null, { headers: corsHeaders });
}

/** 랜덤 솔트 생성 (16바이트 base64) */
function generateSalt() {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return btoa(String.fromCharCode(...salt));
}

/** PBKDF2 비밀번호 해싱 */
async function hashPassword(password, saltB64) {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/** 사용자 생성 */
export async function createUser(kv, username, password) {
  const normalized = username.toLowerCase();
  const userKey = `user:${normalized}`;

  const existing = await kv.get(userKey);
  if (existing) {
    return { error: '이미 존재하는 아이디입니다' };
  }

  const salt = generateSalt();
  const hash = await hashPassword(password, salt);

  await kv.put(userKey, JSON.stringify({
    username: normalized,
    salt,
    hash,
    createdAt: Date.now()
  }));

  return { ok: true, username: normalized };
}

/** 사용자 인증 */
export async function verifyUser(kv, username, password) {
  const normalized = username.toLowerCase();
  const userKey = `user:${normalized}`;

  const raw = await kv.get(userKey);
  if (!raw) {
    return { error: '존재하지 않는 아이디입니다' };
  }

  const user = JSON.parse(raw);
  const hash = await hashPassword(password, user.salt);

  if (hash !== user.hash) {
    return { error: '비밀번호가 올바르지 않습니다' };
  }

  return { ok: true, username: user.username };
}

/** 세션 생성 (UUID 토큰, 30일 TTL) */
export async function createSession(kv, username) {
  const token = crypto.randomUUID();
  const sessionKey = `session:${token}`;

  await kv.put(sessionKey, JSON.stringify({
    username: username.toLowerCase(),
    createdAt: Date.now()
  }), { expirationTtl: SESSION_TTL });

  return token;
}

/** 세션 검증 - 요청에서 토큰 추출 후 username 반환 */
export async function verifySession(kv, request) {
  const token = extractToken(request);
  if (!token) return null;

  const raw = await kv.get(`session:${token}`);
  if (!raw) return null;

  const session = JSON.parse(raw);
  return session.username;
}

/** Authorization 헤더에서 Bearer 토큰 추출 */
export function extractToken(request) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/** 세션 삭제 */
export async function deleteSession(kv, token) {
  if (token) {
    await kv.delete(`session:${token}`);
  }
}

/** 아이디 검증: 3~20자 영문/숫자/언더스코어 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  if (username.length < 3 || username.length > 20) return false;
  return /^[a-zA-Z0-9_]+$/.test(username);
}

/** 비밀번호 검증: 6자 이상 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 6;
}
