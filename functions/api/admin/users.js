/* =====================================================
   api/admin/users.js - 전체 사용자 목록 조회
   GET /api/admin/users  → { users: [...] }

   인증: X-Admin-Key (마스터 키) 또는 admin 역할 Bearer 토큰
   ===================================================== */

import { requireAdmin, onRequestOptions } from '../../_lib/helpers.js';
import { jsonResponse } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  const { admin, response } = await requireAdmin(env.DATA_KV, request, env);
  if (response) return response;

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
            role: user.role || 'user',
            name: user.name || '',
            email: user.email || '',
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

export { onRequestOptions };
