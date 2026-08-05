/* =====================================================
   api/auth/me.js - 세션 확인
   GET /api/auth/me  (Bearer) → { username, role, name, email, createdAt }
   ===================================================== */

import { requireAuth, onRequestOptions } from '../../_lib/helpers.js';
import { jsonResponse } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  const { session, response } = await requireAuth(env.DATA_KV, request, '인증되지 않음');
  if (response) return response;

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

export { onRequestOptions };
