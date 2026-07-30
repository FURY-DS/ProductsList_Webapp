/* =====================================================
   api/auth/logout.js - 로그아웃
   POST /api/auth/logout  (Authorization: Bearer <token>) → { ok: true }
   ===================================================== */

import { extractToken, deleteSession, jsonResponse, handleOptions } from '../../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const token = extractToken(request);
  if (token) {
    await deleteSession(env.DATA_KV, token);
  }

  return jsonResponse({ ok: true });
}

export async function onRequestOptions() {
  return handleOptions();
}
