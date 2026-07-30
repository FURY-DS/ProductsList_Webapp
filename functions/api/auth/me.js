/* =====================================================
   api/auth/me.js - 세션 확인
   GET /api/auth/me  (Authorization: Bearer <token>) → { username }
   ===================================================== */

import { verifySession, jsonResponse, handleOptions } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  const username = await verifySession(env.DATA_KV, request);
  if (!username) {
    return jsonResponse({ error: '인증되지 않음' }, 401);
  }

  return jsonResponse({ username });
}

export async function onRequestOptions() {
  return handleOptions();
}
