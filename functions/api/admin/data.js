/* =====================================================
   api/admin/data.js - 사용자 데이터 조회/삭제
   GET    /api/admin/data?username=xxx  → { data, ts, pages, total }
   DELETE /api/admin/data?username=xxx  → { ok, deleted: [...], count }

   실제 데이터 키 규칙: data:<username>:<pageKey> (3단, pages 전부)
   - 과거에는 2단 키(data:<username>)만 조회/삭제해 실제 데이터가
     전혀 처리되지 않는 버그가 있었음 — prefix 기반 순회로 수정.
   - 레거시 2단 키도 하위 호환을 위해 함께 조회/삭제한다.

   인증: X-Admin-Key (마스터 키) 또는 admin 역할 Bearer 토큰
   ===================================================== */

import { requireAdmin, rawJsonResponse, onRequestOptions } from '../../_lib/helpers.js';
import { jsonResponse, validateUsername } from '../../_lib/auth.js';

/** data:<username>:* prefix의 모든 키를 순회하며 처리 (cursor 페이지네이션) */
async function listUserDataKeys(kv, username) {
  const keys = [];
  let cursor = null;
  do {
    const list = await kv.list({ prefix: `data:${username}:`, cursor });
    for (const key of list.keys) {
      keys.push(key.name);
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  return keys;
}

// GET: 사용자 데이터 조회 (모든 서브페이지 데이터를 페이지별로 묶어 반환)
export async function onRequestGet(context) {
  const { request, env } = context;

  const { admin, response } = await requireAdmin(env.DATA_KV, request, env);
  if (response) return response;

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').toLowerCase();

  if (!username || !validateUsername(username)) {
    return jsonResponse({ error: 'username 파라미터가 필요합니다' }, 400, request);
  }

  const keyPrefix = `data:${username}:`;
  const dataKeys = await listUserDataKeys(env.DATA_KV, username);

  const pages = {};
  let newestTs = 0;

  for (const keyName of dataKeys) {
    const raw = await env.DATA_KV.get(keyName);
    if (!raw) continue;
    try {
      const entry = JSON.parse(raw);
      const pageKey = keyName.slice(keyPrefix.length) || '(unknown)';
      pages[pageKey] = { data: entry.data !== undefined ? entry.data : null, ts: entry.ts || 0 };
      if (entry.ts > newestTs) newestTs = entry.ts;
    } catch (e) {
      pages[keyName.slice(keyPrefix.length) || '(unknown)'] = { data: null, ts: 0, corrupted: true };
    }
  }

  // 레거시 2단 키 (data:<username>) 하위 호환 조회
  const legacyRaw = await env.DATA_KV.get(`data:${username}`);
  if (legacyRaw) {
    try {
      const entry = JSON.parse(legacyRaw);
      pages['(legacy)'] = { data: entry.data !== undefined ? entry.data : null, ts: entry.ts || 0 };
      if (entry.ts > newestTs) newestTs = entry.ts;
    } catch (e) {
      pages['(legacy)'] = { data: null, ts: 0, corrupted: true };
    }
  }

  const total = Object.keys(pages).length;
  if (total === 0) {
    return jsonResponse({ data: null, ts: 0, pages: {}, total: 0 }, 200, request);
  }

  // data 필드에 pages 맵을 담아 반환 (admin.html의 hasData 판정 호환)
  return rawJsonResponse(JSON.stringify({ data: pages, ts: newestTs, pages, total }), request);
}

// DELETE: 사용자 데이터 삭제 (계정은 유지) — 모든 서브페이지 + 레거시 키
export async function onRequestDelete(context) {
  const { request, env } = context;

  const { admin, response } = await requireAdmin(env.DATA_KV, request, env);
  if (response) return response;

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').toLowerCase();

  if (!username || !validateUsername(username)) {
    return jsonResponse({ error: 'username 파라미터가 필요합니다' }, 400, request);
  }

  const dataKeys = await listUserDataKeys(env.DATA_KV, username);
  const deleted = [];

  for (const keyName of dataKeys) {
    await env.DATA_KV.delete(keyName);
    deleted.push(keyName);
  }

  // 레거시 2단 키도 함께 삭제
  await env.DATA_KV.delete(`data:${username}`);
  deleted.push(`data:${username}`);

  // 실제 지운 키 개수를 반환해 조용한 삭제 실패를 방지한다
  return jsonResponse({ ok: true, deleted, count: deleted.length }, 200, request);
}

export { onRequestOptions };
