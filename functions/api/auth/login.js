/* =====================================================
   api/auth/login.js - 로그인
   POST /api/auth/login  { username, password } → { token, username, role }
   ===================================================== */

import { parseJsonBody, checkRateLimit, recordAttempt, onRequestOptions } from '../../_lib/helpers.js';
import { verifyUser, createSession, clearRateLimit, getRateLimitScope, getUserRateLimitScope, jsonResponse } from '../../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const { body, response: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const { username, password } = body;

  if (!username || !password) {
    return jsonResponse({ error: '아이디와 비밀번호를 입력해주세요' }, 400);
  }

  // 버킷 1 scope: IP+아이디 조합 (IP 교체 시 scope가 바뀌어 초기화됨)
  const rateLimitScope = getRateLimitScope(request, username);
  // 버킷 2 scope: 아이디 단위 (IP 무관 — IP를 바꿔도 동일 scope 유지)
  const userScope = getUserRateLimitScope(username);

  // 버킷 1: IP+아이디 조합 — 하드 블록 (같은 IP에서의 무차별 대입 방어)
  const { limited, response: limitRes } = await checkRateLimit(
    env.DATA_KV, 'login', rateLimitScope,
    '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요'
  );
  if (limitRes) return limitRes;

  // 버킷 2: 아이디 단위 (IP 교체 공격 방어) — A안(지연 방식):
  // 하드 블록으로 정상 사용자를 1시간 락아웃하지 않고, 임계 초과 시 응답만 3초 지연시켜
  // 브루트포스 속도를 떨어뜨린다. 정상 사용자는 비밀번호만 맞으면 3초 대기 후 로그인된다.
  const { limited: userLimited } = await checkRateLimit(
    env.DATA_KV, 'login_user', userScope,
    '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요'
  );
  if (userLimited) {
    await sleep(3000);
  }

  const result = await verifyUser(env.DATA_KV, username, password);
  if (result.error) {
    await recordAttempt(env.DATA_KV, 'login', rateLimitScope);
    await recordAttempt(env.DATA_KV, 'login_user', userScope);
    return jsonResponse({ error: result.error }, 401);
  }

  await clearRateLimit(env.DATA_KV, 'login', rateLimitScope);
  await clearRateLimit(env.DATA_KV, 'login_user', userScope);

  const token = await createSession(env.DATA_KV, result.username);

  return jsonResponse({
    token,
    username: result.username,
    role: result.role || 'user'
  });
}

/** 짧은 지연 (계정 단위 임계 초과 시 브루트포스 감속용) */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { onRequestOptions };
