/* =====================================================
   api/data.js - 클라우드 데이터 동기화 (세션 기반)

   GET  /api/data  (Bearer) → { data, ts }
   POST /api/data  (Bearer) → { ok, ts }

   KV 키: data:<username> (per-user 데이터 분리)
   ===================================================== */

import { requireAuth, parseJsonBody, rawJsonResponse, onRequestOptions } from '../_lib/helpers.js';
import { jsonResponse } from '../_lib/auth.js';

// GET: 사용자 데이터 조회 (페이지별 키 분리)
export async function onRequestGet(context) {
  const { request, env } = context;

  const { session, response } = await requireAuth(env.DATA_KV, request);
  if (response) return response;

  const url = new URL(request.url);
  const pageKey = url.searchParams.get('key') || 'main';

  const raw = await env.DATA_KV.get(`data:${session.username}:${pageKey}`);
  if (!raw) {
    return jsonResponse({ data: null, ts: 0 });
  }

  return rawJsonResponse(raw);
}

// POST: 사용자 데이터 저장 (페이지별 키 분리)
export async function onRequestPost(context) {
  const { request, env } = context;

  const { session, response } = await requireAuth(env.DATA_KV, request);
  if (response) return response;

  const { body, response: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  if (!body.data || typeof body.ts !== 'number') {
    return jsonResponse({ error: 'Missing fields (data, ts)' }, 400);
  }

  const pageKey = body.key || 'main';
  const dataKey = `data:${session.username}:${pageKey}`;

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

  await env.DATA_KV.put(dataKey, JSON.stringify({ data: body.data, ts: body.ts, key: pageKey }));

  return jsonResponse({ ok: true, ts: body.ts, key: pageKey });
}

export { onRequestOptions };
