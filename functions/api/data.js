/* =====================================================
   functions/api/data.js - Cloudflare Pages Functions
   클라우드 데이터 동기화 API (KV 기반)

   GET  /api/data?key=productlist_v1  → 데이터 조회
   POST /api/data                      → 데이터 저장
   ===================================================== */

// GET: 클라우드에서 데이터 조회
export async function onRequestGet(context) {
  const { request, env } = context;

  // 인증 확인
  const authKey = request.headers.get('X-Auth-Key');
  if (!authKey || !env.AUTH_KEY || authKey !== env.AUTH_KEY) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key) {
    return jsonResponse({ error: 'Missing key parameter' }, 400);
  }

  const raw = await env.DATA_KV.get(key);
  if (!raw) {
    return jsonResponse({ data: null, ts: 0 });
  }

  return new Response(raw, {
    headers: { 'Content-Type': 'application/json' }
  });
}

// POST: 클라우드에 데이터 저장
export async function onRequestPost(context) {
  const { request, env } = context;

  // 인증 확인
  const authKey = request.headers.get('X-Auth-Key');
  if (!authKey || !env.AUTH_KEY || authKey !== env.AUTH_KEY) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  if (!body.key || !body.data || typeof body.ts !== 'number') {
    return jsonResponse({ error: 'Missing fields (key, data, ts)' }, 400);
  }

  // last-write-wins: 기존 데이터의 타임스탬프 확인
  const existing = await env.DATA_KV.get(body.key);
  if (existing) {
    try {
      const existingData = JSON.parse(existing);
      if (existingData.ts && existingData.ts > body.ts) {
        // 클라우드가 더 최신이면 거부
        return jsonResponse({ ok: false, msg: 'Stale data', cloudTs: existingData.ts }, 409);
      }
    } catch (e) {
      // 기존 데이터 손상 시 무시하고 덮어쓰기
    }
  }

  // KV에 저장 (데이터 + 타임스탬프)
  const payload = JSON.stringify({
    data: body.data,
    ts: body.ts
  });

  await env.DATA_KV.put(body.key, payload);

  return jsonResponse({ ok: true, ts: body.ts });
}

// OPTIONS: CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Key'
    }
  });
}

/** JSON 응답 헬퍼 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Key'
    }
  });
}
