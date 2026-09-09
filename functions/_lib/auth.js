/* =====================================================
   _lib/auth.js - 공통 인증 유틸리티
   PBKDF2 비밀번호 해싱, 세션 관리, CORS 헬퍼, 관리자 인증,
   아이디/비밀번호 찾기 (인증번호), 비밀번호 변경

   KV 구조:
   user:<username>              → { username, salt, hash, role, name, email, createdAt }
   session:<token>              → { username, createdAt }  (TTL 30일)
   data:<username>              → { data, ts }
   ratelimit:<bucket>:<scope>   → { count }  (TTL로 자동 만료)
   verify:<purpose>:<scope>     → { code, username, createdAt }  (TTL 5분)

   role: "admin" | "user"  (기본값 "user")
   ===================================================== */

const SESSION_TTL = 30 * 24 * 60 * 60; // 30일 (초)

// 마이그레이션용 초기 관리자 아이디 (기존 가입자 중 role이 없는 경우)
const INITIAL_ADMINS = ['alcave'];

// 존재하지 않는 사용자도 동일한 PBKDF2 비용을 치르게 해서 로그인 타이밍 차이를 줄인다.
const DUMMY_SALT = 'AAAAAAAAAAAAAAAAAAAAAA==';
const DUMMY_HASH = '';

const corsBaseHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
  'Vary': 'Origin'
};

/**
 * CORS Origin 화이트리스트 검사.
 * - 이 앱의 모든 정상 호출은 같은 오리진( Pages Functions가 같은 도메인에서 서비스됨)에서
 *   발생하므로 CORS 헤더가 없어도 동작한다.
 * - cross-origin 호출은 명시적으로 허용된 오리진(localhost, *.pages.dev preview)에만
 *   Origin을 반영해 응답하고, 그 외에는 ACAO 헤더를 보내지 않는다(fail-closed).
 * - 전면 허용(' *')은 제거했다.
 */
function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  try {
    const o = new URL(origin);
    if (o.hostname === 'localhost' || o.hostname === '127.0.0.1') return true;
    if (o.hostname === 'pages.dev' || o.hostname.endsWith('.pages.dev')) return true;
  } catch (e) {
    return false;
  }
  return false;
}

function buildCorsHeaders(request) {
  const origin = request && request.headers ? request.headers.get('Origin') : null;
  if (origin && isAllowedOrigin(origin)) {
    return { ...corsBaseHeaders, 'Access-Control-Allow-Origin': origin };
  }
  return { ...corsBaseHeaders };
}

export { buildCorsHeaders };

/** JSON 응답 (CORS 포함). request를 넘기면 Origin 화이트리스트 검사 후 반영 */
export function jsonResponse(data, status = 200, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(request)
    }
  });
}

/** CORS preflight 응답. cross-origin 호출 시 허용 오리진에만 반영 */
export function handleOptions(request = null) {
  return new Response(null, { headers: buildCorsHeaders(request) });
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

/** 사용자 생성 (이름/이메일 저장, 기본 role: "user") */
export async function createUser(kv, username, password, name, email) {
  const normalized = username.toLowerCase();
  const normalizedEmail = email.toLowerCase();
  const userKey = `user:${normalized}`;

  const existing = await kv.get(userKey);
  if (existing) {
    return { error: '이미 존재하는 아이디입니다' };
  }

  // 이메일 중복 체크
  const emailKey = `email:${normalizedEmail}`;
  const existingEmail = await kv.get(emailKey);
  if (existingEmail) {
    return { error: '이미 가입된 이메일입니다' };
  }

  const salt = generateSalt();
  const hash = await hashPassword(password, salt);

  const userRecord = {
    username: normalized,
    salt,
    hash,
    role: 'user',
    name,
    email: normalizedEmail,
    createdAt: Date.now()
  };

  await kv.put(userKey, JSON.stringify(userRecord));
  // 이메일 → username 역방향 인덱스 (find-id, find-pw 조회용)
  await kv.put(emailKey, JSON.stringify({ username: normalized, createdAt: Date.now() }));

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
  const normalizedUser = username.toLowerCase();
  const token = crypto.randomUUID();
  const sessionKey = `session:${token}`;

  // 1) 세션 데이터 저장
  await kv.put(sessionKey, JSON.stringify({
    username: normalizedUser,
    createdAt: Date.now()
  }), { expirationTtl: SESSION_TTL });

  // 2) 사용자별 활성 세션 토큰 목록 인덱스 생성 및 누적
  const indexKey = `user_sessions:${normalizedUser}`;
  const existing = await kv.get(indexKey);
  let tokens = [];
  if (existing) {
    try { tokens = JSON.parse(existing); } catch (e) { tokens = []; }
  }
  tokens.push(token);
  if (tokens.length > 50) tokens = tokens.slice(-50); // 좀비 세션 방지 제한
  await kv.put(indexKey, JSON.stringify(tokens), { expirationTtl: SESSION_TTL });

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
    // 세션 삭제 시 인덱스 장부에서도 해당 토큰 제거
    const raw = await kv.get(`session:${token}`);
    if (raw) {
      try {
        const session = JSON.parse(raw);
        const indexKey = `user_sessions:${session.username}`;
        const existing = await kv.get(indexKey);
        if (existing) {
          let tokens = JSON.parse(existing);
          tokens = tokens.filter(t => t !== token);
          if (tokens.length > 0) {
            await kv.put(indexKey, JSON.stringify(tokens), { expirationTtl: SESSION_TTL });
          } else {
            await kv.delete(indexKey);
          }
        }
      } catch (e) { /* ignore */ }
    }
    await kv.delete(`session:${token}`);
  }
}

/**
 * 관리자 접근 확인
 * 방법 1: X-Admin-Key 헤더 (마스터 키) — IP 기준 rate limit + 상수 시간 비교 적용
 * 방법 2: Bearer 토큰 (role이 "admin"인 사용자)
 * → { ok: true, method, username } 또는 { ok: false, rateLimited? }
 */
export async function verifyAdmin(kv, request, env) {
  // 방법 1: X-Admin-Key (마스터 키)
  const adminKey = request.headers.get('X-Admin-Key');
  if (adminKey && env.ADMIN_KEY) {
    const ip = getClientIp(request);

    // 브루트포스 방지: 마스터 키 경로에도 로그인과 별개의 rate limit 적용
    if (await isRateLimited(kv, 'admin_key', ip)) {
      return { ok: false, rateLimited: true };
    }

    if (await constantTimeEqual(adminKey, env.ADMIN_KEY)) {
      return { ok: true, method: 'key', username: null };
    }

    // 키 불일치 시 실패 카운트 기록
    await recordAttempt(kv, 'admin_key', ip);
    return { ok: false };
  }

  // 방법 2: Bearer 토큰 (admin 역할 사용자)
  const session = await verifySession(kv, request);
  if (session && session.role === 'admin') {
    return { ok: true, method: 'token', username: session.username };
  }

  return { ok: false };
}

/** 상수 시간 문자열 비교 (타이밍 공격 완화). SHA-256 해시 후 XOR 비교 */
async function constantTimeEqual(a, b) {
  const enc = new TextEncoder();
  const aBuf = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(a || ''))));
  const bBuf = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(b || ''))));
  let diff = 0;
  for (let i = 0; i < aBuf.byteLength; i++) {
    diff |= aBuf[i] ^ bBuf[i];
  }
  return diff === 0;
}

/* =====================================================
   요청 제한 (Rate Limiting) - IP 기준, 실패 횟수 카운트
   KV 키: ratelimit:<bucket>:<ip> → { count }  (TTL로 자동 만료)
   실제 서비스 중단 없이 브루트포스만 막도록 넉넉한 임계값 사용
   ===================================================== */

const RATE_LIMITS = {
  login:           { windowSec: 15 * 60,      max: 10 }, // 15분에 실패 10회 (IP+아이디 조합)
  login_user:      { windowSec: 60 * 60,      max: 30 }, // 1시간에 실패 30회 (아이디 단위 — IP 교체 공격 방어)
  admin_key:       { windowSec: 15 * 60,      max: 5  }, // 15분에 실패 5회 (마스터 키 브루트포스 방어)
  register:        { windowSec: 60 * 60,      max: 5  }, // 1시간에 시도 5회
  findid_request:  { windowSec: 60 * 60,      max: 10 }, // 1시간에 10회 (미존재 요청도 카운트하므로 상향)
  findid_verify:   { windowSec: 60 * 60,      max: 10 }, // 1시간에 10회 (시도)
  findpw_request:  { windowSec: 60 * 60,      max: 10 }, // 1시간에 10회 (미존재 요청도 카운트하므로 상향)
  findpw_verify:   { windowSec: 60 * 60,      max: 10 }, // 1시간에 10회 (시도)
  change_password: { windowSec: 60 * 60,      max: 10 }  // 1시간에 10회
};

/**
 * 요청에서 클라이언트 IP 추출.
 * Cloudflare 엣지가 설정하는 CF-Connecting-IP만 신뢰한다.
 * X-Forwarded-For는 클라이언트가 임의로 조작할 수 있어 rate limit 우회 수단이 되므로 사용하지 않는다.
 */
export function getClientIp(request) {
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) return cfIp.trim();
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

/** 아이디 단위 rate limit scope (IP 무관 — 계정별 브루트포스 방어용) */
export function getUserRateLimitScope(username = '') {
  return String(username || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_@.-]/g, '_')
    .slice(0, 64) || 'unknown';
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

// 흔한 비밀번호 blacklist (credential stuffing 대상 1순위)
const COMMON_PASSWORDS = new Set([
  '123456', '1234567', '12345678', '123456789', '1234567890',
  '111111', '000000', '121212', '123123', '666666', '888888',
  'password', 'password1', 'passw0rd',
  'qwerty', 'qwerty123', 'asdfasdf', 'abc123', '1q2w3e', '1q2w3e4r'
]);

/**
 * 비밀번호 검증: 8~128자 + 흔한 비밀번호 금지.
 * - 상한(128자): PBKDF2에 초장문 입력 시 Worker CPU 고갈(DoS) 방지
 * - 하한 상향(8자)은 회원가입/변경 시에만 적용되고 로그인 경로는 검사하지 않으므로
 *   기존 사용자가 잠기지 않는다.
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 128) return false;
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return false;
  return true;
}

/** 이름 검증: 1~20자, 공백/특수문자 일부 허용 */
export function validateName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 20) return false;
  // 한글, 영문, 숫자, 공백, 하이픈, 점만 허용
  return /^[가-힣a-zA-Z0-9 .\-_]+$/.test(trimmed);
}

/**
 * 이메일 검증: 실제 이메일 문자셋으로 제한 + 최대 길이.
 * - 로컬파트: 영문/숫자/._%+- 만 허용 (공백, <, >, ", /, = 등 HTML 특수문자 차단
 *   → 관리자 화면 등에서 이스케이프 누락 시에도 저장형 XSS 표면 제거)
 * - 도메인: 영문/숫자/하이픈 + 점 구분 TLD(2자 이상)
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(email);
}

/* =====================================================
   아이디/비밀번호 찾기 (이메일 인증번호)
   verify:<purpose>:<scope> 에 6자리 코드 저장 (TTL 5분)
   ===================================================== */
const VERIFY_CODE_TTL = 5 * 60; // 5분

/** 6자리 숫자 인증번호 생성 (선두 0 포함 가능) */
export function generateVerificationCode() {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  // 4바이트 → 0~999999
  const n = ((arr[0] << 24) | (arr[1] << 16) | (arr[2] << 8) | arr[3]) >>> 0;
  const code = (n % 1000000).toString().padStart(6, '0');
  return code;
}

/** 인증번호 저장 (scope는 자유 형식, KV 키 충돌 방지용으로 정규화) */
function buildVerifyKey(purpose, scope) {
  const safe = String(scope).toLowerCase().replace(/[^a-z0-9_@.\-]/g, '_');
  return `verify:${purpose}:${safe}`;
}

export async function storeVerificationCode(kv, purpose, scope, code, username) {
  const key = buildVerifyKey(purpose, scope);
  await kv.put(key, JSON.stringify({
    code,
    username,
    createdAt: Date.now()
  }), { expirationTtl: VERIFY_CODE_TTL });
}

/**
 * 인증번호 검증 - 성공 시 삭제 (일회용)
 * @returns { ok, username } | { error }
 */
export async function verifyAndConsumeCode(kv, purpose, scope, code) {
  const key = buildVerifyKey(purpose, scope);
  const raw = await kv.get(key);
  if (!raw) return { error: '인증번호가 만료되었거나 존재하지 않습니다' };

  let entry;
  try {
    entry = JSON.parse(raw);
  } catch (e) {
    await kv.delete(key);
    return { error: '인증번호가 손상되었습니다' };
  }

  if (entry.code !== String(code).trim()) {
    // 오답 시 실패 횟수(failCount)를 누적 기록
    entry.failCount = (entry.failCount || 0) + 1;
    if (entry.failCount >= 5) {
      await kv.delete(key); // 5회 초과 시 강제 무효화
      return { error: '인증번호 확인 시도 횟수(5회)를 초과하여 인증번호가 파기되었습니다. 다시 요청해주세요.' };
    }
    // 기존 만료 시간(5분) 내 유효기간 유지 계산
    const elapsedSec = Math.floor((Date.now() - (entry.createdAt || Date.now())) / 1000);
    const remainingTtl = Math.max(10, 300 - elapsedSec);
    await kv.put(key, JSON.stringify(entry), { expirationTtl: remainingTtl });

    return { error: `인증번호가 일치하지 않습니다. (남은 시도: ${5 - entry.failCount}회)` };
  }

  // 일회용 — 검증 성공 시 즉시 삭제
  await kv.delete(key);
  return { ok: true, username: entry.username };
}

/* =====================================================
   사용자 조회 (find-id, find-pw용)
   ===================================================== */

/** 이메일 → username 역방향 인덱스로 사용자 조회 */
export async function findUserByEmail(kv, email) {
  const normalized = email.toLowerCase();
  const emailKey = `email:${normalized}`;
  const raw = await kv.get(emailKey);
  if (!raw) return null;
  try {
    const { username } = JSON.parse(raw);
    const userRaw = await kv.get(`user:${username}`);
    if (!userRaw) return null;
    return JSON.parse(userRaw);
  } catch (e) {
    return null;
  }
}

/** 이름 + 이메일로 사용자 찾기 (아이디 찾기) */
export async function findUserByNameAndEmail(kv, name, email) {
  const user = await findUserByEmail(kv, email);
  if (!user) return null;
  if (user.name !== name.trim()) return null;
  return user;
}

/** 이름 + 아이디 + 이메일로 사용자 찾기 (비밀번호 찾기) */
export async function findUserByNameUsernameAndEmail(kv, name, username, email) {
  const user = await findUserByNameAndEmail(kv, name, email);
  if (!user) return null;
  if (user.username !== username.toLowerCase()) return null;
  return user;
}

/* =====================================================
   비밀번호 변경 (인증된 세션 필요)
   ===================================================== */

/**
 * 비밀번호 변경
 * @returns { ok, error? }
 */
export async function changePassword(kv, username, oldPassword, newPassword) {
  const normalized = username.toLowerCase();
  const userKey = `user:${normalized}`;
  const raw = await kv.get(userKey);
  if (!raw) return { error: '사용자를 찾을 수 없습니다' };

  const user = JSON.parse(raw);
  const oldHash = await hashPassword(oldPassword, user.salt);
  if (oldHash !== user.hash) {
    return { error: '현재 비밀번호가 올바르지 않습니다' };
  }

  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);

  user.salt = newSalt;
  user.hash = newHash;
  user.passwordChangedAt = Date.now();

  await kv.put(userKey, JSON.stringify(user));
  return { ok: true };
}

/**
 * 비밀번호 재설정 (이메일 인증 후, 현재 비번 모름)
 * - changePassword와 달리 oldPassword 검증 없음
 */
export async function resetPassword(kv, username, newPassword) {
  const normalized = username.toLowerCase();
  const userKey = `user:${normalized}`;
  const raw = await kv.get(userKey);
  if (!raw) return { error: '사용자를 찾을 수 없습니다' };

  const user = JSON.parse(raw);
  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);

  user.salt = newSalt;
  user.hash = newHash;
  user.passwordChangedAt = Date.now();

  await kv.put(userKey, JSON.stringify(user));
  return { ok: true };
}

/**
 * 특정 사용자의 모든 세션 삭제 (비밀번호 재설정 시 사용)
 * - session:<token> KV 키를 순회
 * - KV list는 페이지네이션이 있으므로 cursor 사용
 */
export async function deleteAllSessionsForUser(kv, username, exceptToken = null) {
  const target = username.toLowerCase();
  const indexKey = `user_sessions:${target}`;

  // 사용자 세션 인덱스 조회
  const rawIndex = await kv.get(indexKey);
  if (!rawIndex) {
    // 폴백(Fallback): 인덱스 생성 전 구버전 활성 세션 무효화를 위해 레거시 스캔 실행
    return await legacyDeleteAllSessionsForUser(kv, target, exceptToken);
  }

  let tokens = [];
  try {
    tokens = JSON.parse(rawIndex);
  } catch (e) {
    return await legacyDeleteAllSessionsForUser(kv, target, exceptToken);
  }

  let deleted = 0;
  const remainingTokens = [];

  for (const token of tokens) {
    if (exceptToken && token === exceptToken) {
      remainingTokens.push(token);
      continue;
    }
    await kv.delete(`session:${token}`);
    deleted++;
  }

  if (remainingTokens.length > 0) {
    await kv.put(indexKey, JSON.stringify(remainingTokens), { expirationTtl: SESSION_TTL });
  } else {
    await kv.delete(indexKey);
  }
  return deleted;
}

// 하위 호환성을 유지하기 위한 기존 레거시 스캔 방식 백업용 함수
async function legacyDeleteAllSessionsForUser(kv, username, exceptToken = null) {
  const target = username.toLowerCase();
  const skipKey = exceptToken ? `session:${exceptToken}` : null;
  let cursor = null;
  let deleted = 0;
  do {
    const list = await kv.list({ prefix: 'session:', cursor });
    for (const key of list.keys) {
      if (skipKey && key.name === skipKey) continue;
      try {
        const raw = await kv.get(key.name);
        if (!raw) continue;
        const session = JSON.parse(raw);
        if (session.username === target) {
          await kv.delete(key.name);
          deleted++;
        }
      } catch (e) { /* 손상 무시 */ }
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  return deleted;
}
