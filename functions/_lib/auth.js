/* =====================================================
   _lib/auth.js - 공통 인증 유틸리티
   PBKDF2 비밀번호 해싱, 세션 관리, CORS 헬퍼, 관리자 인증

   KV 구조:
   user:<username>    → { username, salt, hash, role, createdAt }
   session:<token>    → { username, createdAt }  (TTL 30일)
   data:<username>    → { data, ts }

   role: "admin" | "user"  (기본값 "user")
   ===================================================== */

const SESSION_TTL = 30 * 24 * 60 * 60; // 30일 (초)

// 마이그레이션용 초기 관리자 아이디 (기존 가입자 중 role이 없는 경우)
const INITIAL_ADMINS = ['alcave'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key'
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

/** 사용자 생성 (기본 role: "user") */
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
    role: 'user',
    createdAt: Date.now()
  }));

  return { ok: true, username: normalized, role: 'user' };
}

/** 사용자 인증 - role 포함 반환 */
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

  // 마이그레이션: role이 없으면 초기 관리자 목록으로 판단
  if (!user.role) {
    user.role = INITIAL_ADMINS.includes(normalized) ? 'admin' : 'user';
    await kv.put(userKey, JSON.stringify(user));
  }

  return { ok: true, username: user.username, role: user.role };
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

/**
 * 세션 검증 - 요청에서 토큰 추출 후 { username, role } 반환
 * role을 얻기 위해 user 레코드를 추가 조회 + 마이그레이션
 */
export async function verifySession(kv, request) {
  const token = extractToken(request);
  if (!token) return null;

  const raw = await kv.get(`session:${token}`);
  if (!raw) return null;

  const session = JSON.parse(raw);
  const username = session.username;

  // user 레코드에서 role 조회 + 마이그레이션
  const userRaw = await kv.get(`user:${username}`);
  if (!userRaw) return null;

  const user = JSON.parse(userRaw);

  // 마이그레이션: role이 없으면 초기 관리자 목록으로 판단
  if (!user.role) {
    user.role = INITIAL_ADMINS.includes(username) ? 'admin' : 'user';
    await kv.put(`user:${username}`, JSON.stringify(user));
  }

  return { username, role: user.role };
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

/**
 * 관리자 접근 확인
 * 방법 1: X-Admin-Key 헤더 (마스터 키)
 * 방법 2: Bearer 토큰 (role이 "admin"인 사용자)
 * → { ok: true, method, username } 또는 { ok: false }
 */
export async function verifyAdmin(kv, request, env) {
  // 방법 1: X-Admin-Key (마스터 키)
  const adminKey = request.headers.get('X-Admin-Key');
  if (adminKey && env.ADMIN_KEY && adminKey === env.ADMIN_KEY) {
    return { ok: true, method: 'key', username: null };
  }

  // 방법 2: Bearer 토큰 (admin 역할 사용자)
  const session = await verifySession(kv, request);
  if (session && session.role === 'admin') {
    return { ok: true, method: 'token', username: session.username };
  }

  return { ok: false };
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
