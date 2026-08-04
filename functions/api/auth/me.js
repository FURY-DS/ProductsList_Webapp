/* =====================================================
   api/auth/me.js - 세션 확인
   GET /api/auth/me  (Authorization: Bearer <token>)
   → { username, role, name, email, createdAt }
   ===================================================== */

import { verifySession, jsonResponse, handleOptions } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  const session = await verifySession(env.DATA_KV, request);
  if (!session) {
    return jsonResponse({ error: '인증되지 않음' }, 401);
  }

  // user 레코드를 한 번 더 읽어 추가 정보 반환 (name, email, createdAt)
  const userRaw = await env.DATA_KV.get(`user:${session.username}`);
  let user = null;
  if (userRaw) {
    try { user = JSON.parse(userRaw); } catch (e) { /* 손상 무시 */ }
  }

  return jsonResponse({
    username: session.username,
    role: session.role,
    name: user ? user.name : null,
    email: user ? user.email : null,
    createdAt: user ? (user.createdAt || null) : null
  });
}

export async function onRequestOptions() {
  return handleOptions();
}
