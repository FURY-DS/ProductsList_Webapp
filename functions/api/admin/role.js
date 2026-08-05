/* =====================================================
   api/admin/role.js - 사용자 등급 변경
   POST /api/admin/role  { username, role } → { ok, username, role }

   role: "admin" | "user"
   인증: X-Admin-Key (마스터 키) 또는 admin 역할 Bearer 토큰
   ===================================================== */

import { requireAdmin, parseJsonBody, onRequestOptions } from '../../_lib/helpers.js';
import { jsonResponse } from '../../_lib/auth.js';

const VALID_ROLES = ['admin', 'user'];

export async function onRequestPost(context) {
  const { request, env } = context;

  const { admin, response: authErr } = await requireAdmin(env.DATA_KV, request, env);
  if (authErr) return authErr;

  const { body, response: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const username = (body.username || '').toLowerCase();
  const role = body.role || '';

  if (!username) {
    return jsonResponse({ error: 'username이 필요합니다' }, 400);
  }

  if (!VALID_ROLES.includes(role)) {
    return jsonResponse({ error: 'role은 "admin" 또는 "user"이어야 합니다' }, 400);
  }

  const userKey = `user:${username}`;
  const raw = await env.DATA_KV.get(userKey);
  if (!raw) {
    return jsonResponse({ error: '존재하지 않는 사용자입니다' }, 404);
  }

  // 자기 자신의 등급 강하 방지 (토큰 인증 시)
  if (admin.username && admin.username === username && role !== 'admin') {
    return jsonResponse({ error: '자기 자신의 관리자 등급을 해제할 수 없습니다' }, 400);
  }

  const user = JSON.parse(raw);
  user.role = role;
  await env.DATA_KV.put(userKey, JSON.stringify(user));

  return jsonResponse({ ok: true, username, role });
}

export { onRequestOptions };
