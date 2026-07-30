/* =====================================================
   api/auth/login.js - 로그인
   POST /api/auth/login  { username, password } → { token, username }
   ===================================================== */

import {
  verifyUser, createSession,
  jsonResponse, handleOptions
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

  const result = await verifyUser(env.DATA_KV, username, password);
  if (result.error) {
    return jsonResponse({ error: result.error }, 401);
  }

  const token = await createSession(env.DATA_KV, result.username);

  return jsonResponse({ token, username: result.username });
}

export async function onRequestOptions() {
  return handleOptions();
}
