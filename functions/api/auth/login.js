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

  // 버킷 1: IP+아이디 조합 (기존)
  const rateLimitScope = getRateLimitScope(request, username);
  // 버킷 2: 아이디 단위 (IP 교체 공격 방어 — 공격자가 IP를 바꿔도 계정당 시도 제한)
  const userScope = getUserRateLimitScope(username);

  const { limited, response: limitRes } = await checkRateLimit(
    env.DATA_KV, 'login', rateLimitScope,
    '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요'
  );
  if (limitRes) return limitRes;

  const { limited: userLimited, response: userLimitRes } = await checkRateLimit(
    env.DATA_KV, 'login_user', userScope,
    '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요'
  );
  if (userLimitRes) return userLimitRes;

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

export { onRequestOptions };
