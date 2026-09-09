/* =====================================================
   api/data.js - 클라우드 데이터 동기화 (세션 기반)

   GET  /api/data  (Bearer) → { data, ts }
   POST /api/data  (Bearer) → { ok, ts }

   KV 키: data:<username>:<pageKey> (per-user + per-page 데이터 분리)

   보안:
   - pageKey는 화이트리스트로만 허용 (KV 키 무한 생성 방지)
   - 저장 payload 크기 상한 (KV 쓰기 비용 폭탄 방지)
   - username은 세션에서만 취득 (IDOR 없음 — 기존 패턴 유지)
   ===================================================== */

import { requireAuth, parseJsonBody, rawJsonResponse, onRequestOptions } from '../_lib/helpers.js';
import { jsonResponse } from '../_lib/auth.js';

// 허용된 pageKey 화이트리스트
// - main: 레거시 기본값 (기존 데이터 호환)
// - *_v1: 각 페이지 STORAGE_KEY (config.js 참조)
// - menu_settings: 메뉴 환경설정 동기화 (menu.js)
const ALLOWED_PAGE_KEYS = new Set([
  'main',
  'menu_settings',
  'productlist_v1',
  'smartstore_v1', 'coupang_v1', 'esm_v1', 'elevenst_v1',
  'ownerclan_v1', 'domagguk_v1', 'always_v1', 'tossshopping_v1',
  'nshipping_v1', 'rocketgrowth_v1'
]);

// 저장 payload 상한 (JSON 문자열 기준 20MB)
// - 프론트 이미지 제한: 원본 파일 5MB(마켓노트) / 2MB(판매페이지), base64 인코딩 시 약 1.33배
// - Cloudflare KV 값당 한도는 25MB — 정상 사용은 보존하면서 남용만 차단
const MAX_PAYLOAD_SIZE = 20 * 1024 * 1024;

// GET: 사용자 데이터 조회 (페이지별 키 분리)
export async function onRequestGet(context) {
  const { request, env } = context;

  const { session, response } = await requireAuth(env.DATA_KV, request);
  if (response) return response;

  const url = new URL(request.url);
  const pageKey = url.searchParams.get('key') || 'main';

  if (!ALLOWED_PAGE_KEYS.has(pageKey)) {
    return jsonResponse({ error: '허용되지 않은 페이지 키입니다' }, 400, request);
  }

  const raw = await env.DATA_KV.get(`data:${session.username}:${pageKey}`);
  if (!raw) {
    return jsonResponse({ data: null, ts: 0 }, 200, request);
  }

  return rawJsonResponse(raw, request);
}

// POST: 사용자 데이터 저장 (페이지별 키 분리)
export async function onRequestPost(context) {
  const { request, env } = context;

  const { session, response } = await requireAuth(env.DATA_KV, request);
  if (response) return response;

  const { body, response: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  if (!body.data || typeof body.ts !== 'number' || !Number.isFinite(body.ts)) {
    return jsonResponse({ error: 'Missing fields (data, ts)' }, 400, request);
  }

  const pageKey = body.key || 'main';

  if (!ALLOWED_PAGE_KEYS.has(pageKey)) {
    return jsonResponse({ error: '허용되지 않은 페이지 키입니다' }, 400, request);
  }

  // payload 크기 제한
  let serialized;
  try {
    serialized = JSON.stringify(body.data);
  } catch (e) {
    return jsonResponse({ error: '직렬화할 수 없는 데이터입니다' }, 400, request);
  }
  if (serialized.length > MAX_PAYLOAD_SIZE) {
    return jsonResponse({ error: 'Payload too large (max 20MB)' }, 413, request);
  }

  const dataKey = `data:${session.username}:${pageKey}`;

  // last-write-wins: 기존 데이터의 타임스탬프 확인
  const existing = await env.DATA_KV.get(dataKey);
  if (existing) {
    try {
      const existingData = JSON.parse(existing);
      if (existingData.ts && existingData.ts > body.ts) {
        return jsonResponse({ ok: false, msg: 'Stale data', cloudTs: existingData.ts }, 409, request);
      }
    } catch (e) {
      // 기존 데이터 손상 시 무시하고 덮어쓰기
    }
  }

  await env.DATA_KV.put(dataKey, JSON.stringify({ data: body.data, ts: body.ts, key: pageKey }));

  return jsonResponse({ ok: true, ts: body.ts, key: pageKey }, 200, request);
}

export { onRequestOptions };
