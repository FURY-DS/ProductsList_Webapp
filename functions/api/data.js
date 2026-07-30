/* =====================================================
   api/data.js - 클라우드 데이터 동기화 (세션 기반)

   GET  /api/data  (Authorization: Bearer <token>) → { data, ts }
   POST /api/data  (Authorization: Bearer <token>) → { ok, ts }

   KV 키: data:<username> (per-user 데이터 분리)
   ===================================================== */

import { verifySession, jsonResponse, handleOptions } from '../_lib/auth.js';

// GET: 사용자 데이터 조회
export async function onRequestGet(context) {
  const { request, env } = context;

  const session = await verifySession(env.DATA_KV, request);
  if (!session) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const dataKey = `data:${session.username}`;
  const raw = await env.DATA_KV.get(dataKey);

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

// POST: 사용자 데이터 저장
export async function onRequestPost(context) {
  const { request, env } = context;

  const session = await verifySession(env.DATA_KV, request);
  if (!session) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  if (!body.data || typeof body.ts !== 'number') {
    return jsonResponse({ error: 'Missing fields (data, ts)' }, 400);
  }

  const dataKey = `data:${session.username}`;

  // last-write-wins: 기존 데이터의 타임스탬프 확인
  const existing = await env.DATA_KV.get(dataKey);
  if (existing) {
    try {
      const existingData = JSON.parse(existing);
      if (existingData.ts && existingData.ts > body.ts) {
        return jsonResponse({ ok: false, msg: 'Stale data', cloudTs: existingData.ts }, 409);
      }
    } catch (e) {
      // 기존 데이터 손상 시 무시하고 덮어쓰기
    }
  }

  const payload = JSON.stringify({
    data: body.data,
    ts: body.ts
  });

  await env.DATA_KV.put(dataKey, payload);

  return jsonResponse({ ok: true, ts: body.ts });
}

// OPTIONS: CORS preflight
export async function onRequestOptions() {
  return handleOptions();
}
