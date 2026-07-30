/* =====================================================
   api/admin/data.js - 사용자 데이터 조회/삭제
   GET    /api/admin/data?username=xxx  → { data, ts }
   DELETE /api/admin/data?username=xxx  → { ok }

   인증: X-Admin-Key (마스터 키) 또는 admin 역할 Bearer 토큰
   ===================================================== */

import { verifyAdmin, jsonResponse, handleOptions } from '../../_lib/auth.js';

// GET: 사용자 데이터 조회
export async function onRequestGet(context) {
  const { request, env } = context;

  const admin = await verifyAdmin(env.DATA_KV, request, env);
  if (!admin.ok) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').toLowerCase();

  if (!username) {
    return jsonResponse({ error: 'username 파라미터가 필요합니다' }, 400);
  }

  const raw = await env.DATA_KV.get(`data:${username}`);
  if (!raw) {
    return jsonResponse({ data: null, ts: 0 });
  }

  return new Response(raw, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// DELETE: 사용자 데이터 삭제 (계정은 유지)
export async function onRequestDelete(context) {
  const { request, env } = context;

  const admin = await verifyAdmin(env.DATA_KV, request, env);
  if (!admin.ok) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').toLowerCase();

  if (!username) {
    return jsonResponse({ error: 'username 파라미터가 필요합니다' }, 400);
  }

  await env.DATA_KV.delete(`data:${username}`);

  return jsonResponse({ ok: true, deleted: `data:${username}` });
}

export async function onRequestOptions() {
  return handleOptions();
}
