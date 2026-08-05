/* =====================================================
   _lib/helpers.js - API 핸들러 공통 헬퍼
   모든 핸들러에서 반복되는 패턴을 통합:
   - OPTIONS preflight (re-export)
   - JSON body 파싱
   - 세션/관리자 인증 게이트
   - Rate limit 검사
   - Raw JSON 응답 (KV 데이터 직접 반환)
   ===================================================== */

import {
  verifySession, verifyAdmin,
  jsonResponse, handleOptions,
  getClientIp, isRateLimited, recordAttempt
} from './auth.js';

/** OPTIONS preflight — 모든 라우트에서 동일 */
export async function onRequestOptions() {
  return handleOptions();
}

/**
 * JSON body 파싱 + 에러 처리
 * @returns {{ body: object|null, response?: Response }}
 *   response가 있으면 파싱 실패 (400)
 */
export async function parseJsonBody(request) {
  try {
    const body = await request.json();
    return { body };
  } catch (e) {
    return { body: null, response: jsonResponse({ error: '잘못된 요청입니다' }, 400) };
  }
}

/**
 * 세션 인증 게이트 — 실패 시 401 응답 반환
 * @param {KVNamespace} kv
 * @param {Request} request
 * @param {string} errorMsg - 401 에러 메시지 (기본값: 'Unauthorized')
 * @returns {{ session: object|null, response?: Response }}
 *   response가 있으면 인증 실패
 */
export async function requireAuth(kv, request, errorMsg = 'Unauthorized') {
  const session = await verifySession(kv, request);
  if (!session) {
    return { session: null, response: jsonResponse({ error: errorMsg }, 401) };
  }
  return { session };
}

/**
 * 관리자 인증 게이트 — 실패 시 401 응답 반환
 * @returns {{ admin: object|null, response?: Response }}
 *   response가 있으면 인증 실패
 */
export async function requireAdmin(kv, request, env) {
  const admin = await verifyAdmin(kv, request, env);
  if (!admin.ok) {
    return { admin: null, response: jsonResponse({ error: 'Unauthorized' }, 401) };
  }
  return { admin };
}

/**
 * Rate limit 검사 — 초과 시 429 응답 반환
 * @param {string} bucket - rate limit 버킷명 ('login', 'register', ...)
 * @param {string} scope - 제한 기준 (IP, username 등)
 * @param {string} errorMsg - 429 에러 메시지
 * @returns {{ limited: boolean, scope: string, response?: Response }}
 *   response가 있으면 제한 초과
 */
export async function checkRateLimit(kv, bucket, scope, errorMsg) {
  const msg = errorMsg || '요청이 너무 많습니다. 잠시 후 다시 시도해주세요';
  if (await isRateLimited(kv, bucket, scope)) {
    return { limited: true, scope, response: jsonResponse({ error: msg }, 429) };
  }
  return { limited: false, scope };
}

/** 요청에서 클라이언트 IP 추출 (rate limit scope용) */
export function ipScope(request) {
  return getClientIp(request);
}

/**
 * Raw KV 데이터를 JSON 응답으로 반환 (CORS 포함)
 * data.js, admin/data.js에서 사용
 */
export function rawJsonResponse(raw) {
  return new Response(raw, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/** recordAttempt re-export (체크 후 나중에 호출용) */
export { recordAttempt };
