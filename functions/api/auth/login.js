/* =====================================================
   api/auth/login.js - 로그인
   POST /api/auth/login  { username, password } → { token, username, role }
   ===================================================== */

import {
  verifyUser, createSession,
  jsonResponse, handleOptions,
  getRateLimitScope, isRateLimited, recordAttempt, clearRateLimit
} from '../../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: '잘못된 요청입니다' }, 400);
  }

  const { username, password } = body;

  if (!username || !password) {
    return jsonResponse({ error: '아이디와 비밀번호를 입력해주세요' }, 400);
  }

  const rateLimitScope = getRateLimitScope(request, username);

  if (await isRateLimited(env.DATA_KV, 'login', rateLimitScope)) {
    return jsonResponse({ error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요' }, 429);
  }

  const result = await verifyUser(env.DATA_KV, username, password);
  if (result.error) {
    await recordAttempt(env.DATA_KV, 'login', rateLimitScope);
    return jsonResponse({ error: result.error }, 401);
  }

  await clearRateLimit(env.DATA_KV, 'login', rateLimitScope);

  const token = await createSession(env.DATA_KV, result.username);

  return jsonResponse({
    token,
    username: result.username,
    role: result.role || 'user'
  });
}

export async function onRequestOptions() {
  return handleOptions();
}
