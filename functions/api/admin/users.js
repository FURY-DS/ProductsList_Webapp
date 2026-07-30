/* =====================================================
   api/admin/users.js - 전체 사용자 목록 조회
   GET /api/admin/users  (X-Admin-Key header) → { users: [...] }

   KV list() 로 user: 접두사 키를 모두 가져옴
   ===================================================== */

import { jsonResponse, handleOptions } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  // 관리자 인증
  const adminKey = request.headers.get('X-Admin-Key');
  if (!adminKey || adminKey !== env.ADMIN_KEY) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const users = [];
  let cursor;

  do {
    const result = await env.DATA_KV.list({ prefix: 'user:', cursor });
    for (const key of result.keys) {
      const raw = await env.DATA_KV.get(key.name);
      if (raw) {
        try {
          const user = JSON.parse(raw);
          users.push({
            username: user.username,
            createdAt: user.createdAt || 0
          });
        } catch (e) {
          // 손상된 데이터 건너뜀
        }
      }
    }
    cursor = result.list_complete ? null : result.cursor;
  } while (cursor);

  // 생성일 역순 정렬
  users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return jsonResponse({ users });
}

export async function onRequestOptions() {
  return handleOptions();
}
