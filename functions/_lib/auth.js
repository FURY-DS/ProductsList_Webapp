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

// 존재하지 않는 사용자도 동일한 PBKDF2 비용을 치르게 해서 로그인 타이밍 차이를 줄인다.
const DUMMY_SALT = 'AAAAAAAAAAAAAAAAAAAAAA==';
const DUMMY_HASH = '';

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

// 로그인 실패 시 공통 메시지 (아이디 존재 여부가 드러나지 않도록 동일한 문구 사용)
const LOGIN_FAIL_MESSAGE = '아이디 또는 비밀번호가 올바르지 않습니다';

/** 사용자 인증 - role 포함 반환 */
export async function verifyUser(kv, username, password) {
  const normalized = username.toLowerCase();
  const userKey = `user:${normalized}`;

  const raw = await kv.get(userKey);
  const user = raw ? JSON.parse(raw) : { salt: DUMMY_SALT, hash: DUMMY_HASH };
  const hash = await hashPassword(password, user.salt);

  if (!raw || hash !== user.hash) {
    return { error: LOGIN_FAIL_MESSAGE };
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

/* =====================================================
   요청 제한 (Rate Limiting) - IP 기준, 실패 횟수 카운트
   KV 키: ratelimit:<bucket>:<ip> → { count }  (TTL로 자동 만료)
   실제 서비스 중단 없이 브루트포스만 막도록 넉넉한 임계값 사용
   ===================================================== */

const RATE_LIMITS = {
  login:    { windowSec: 15 * 60,      max: 10 }, // 15분에 실패 10회
  register: { windowSec: 60 * 60,      max: 5  }  // 1시간에 시도 5회
};

/** 요청에서 클라이언트 IP 추출 (Cloudflare가 엣지에서 신뢰성 있게 설정) */
export function getClientIp(request) {
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) return cfIp;

  const forwardedFor = request.headers.get('X-Forwarded-For');
  if (forwardedFor) return forwardedFor.split(',')[0].trim() || 'unknown';

  return 'unknown';
}

/** rate limit 키에 넣을 값을 안정적인 길이로 정리 */
export function getRateLimitScope(request, username = '') {
  const ip = getClientIp(request);
  const userPart = String(username || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_@.-]/g, '_')
    .slice(0, 64) || 'unknown';
  return `${ip}:${userPart}`;
}

/** 현재 제한 초과 상태인지 확인 (카운트를 늘리지 않음) */
export async function isRateLimited(kv, bucket, scope) {
  const cfg = RATE_LIMITS[bucket];
  if (!cfg) return false;

  const raw = await kv.get(`ratelimit:${bucket}:${scope}`);
  if (!raw) return false;

  try {
    const entry = JSON.parse(raw);
    return (entry.count || 0) >= cfg.max;
  } catch (e) {
    return false;
  }
}

/** 시도 횟수 1 증가 (윈도우 만료 시 자동으로 다시 0부터 시작) */
export async function recordAttempt(kv, bucket, scope) {
  const cfg = RATE_LIMITS[bucket];
  if (!cfg) return;

  const key = `ratelimit:${bucket}:${scope}`;
  const raw = await kv.get(key);
  let count = 1;

  if (raw) {
    try {
      count = (JSON.parse(raw).count || 0) + 1;
    } catch (e) {
      // 손상된 카운터는 무시하고 1부터 다시 시작
    }
  }

  await kv.put(key, JSON.stringify({ count }), { expirationTtl: cfg.windowSec });
}

/** 로그인 성공 시 실패 카운터 초기화 (정상 사용자가 잠기지 않도록) */
export async function clearRateLimit(kv, bucket, scope) {
  await kv.delete(`ratelimit:${bucket}:${scope}`);
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
