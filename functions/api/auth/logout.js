/* =====================================================
   api/auth/logout.js - 로그아웃
   POST /api/auth/logout  (Bearer) → { ok: true }
   ===================================================== */

import { extractToken, deleteSession, jsonResponse } from '../../_lib/auth.js';
import { onRequestOptions } from '../../_lib/helpers.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const token = extractToken(request);
  if (token) {
    await deleteSession(env.DATA_KV, token);
  }

  return jsonResponse({ ok: true });
}

export { onRequestOptions };
