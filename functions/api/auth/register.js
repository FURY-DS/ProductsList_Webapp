/* =====================================================
   api/auth/register.js - 회원가입
   POST /api/auth/register  { username, password } → { token, username, role }

   모든 신규 가입자는 role: "user"
   ===================================================== */

import {
  createUser, createSession,
  validateUsername, validatePassword,
  jsonResponse, handleOptions,
  getClientIp, isRateLimited, recordAttempt
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

  if (!validateUsername(username)) {
    return jsonResponse({ error: '아이디는 3~20자의 영문/숫자만 가능합니다' }, 400);
  }

  if (!validatePassword(password)) {
    return jsonResponse({ error: '비밀번호는 6자 이상이어야 합니다' }, 400);
  }

  const ip = getClientIp(request);

  if (await isRateLimited(env.DATA_KV, 'register', ip)) {
    return jsonResponse({ error: '가입 시도가 너무 많습니다. 잠시 후 다시 시도해주세요' }, 429);
  }
  await recordAttempt(env.DATA_KV, 'register', ip);

  const result = await createUser(env.DATA_KV, username, password);
  if (result.error) {
    return jsonResponse({ error: result.error }, 409);
  }

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
