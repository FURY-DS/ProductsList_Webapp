/* =====================================================
   api/admin/user.js - 사용자 계정 관리
   DELETE /api/admin/user?username=xxx  → 계정+데이터+세션 전체 삭제
   POST   /api/admin/user  { username, newPassword } → 비밀번호 재설정

   인증: X-Admin-Key (마스터 키) 또는 admin 역할 Bearer 토큰
   ===================================================== */

import {
  verifyAdmin, jsonResponse, handleOptions,
  validateUsername, validatePassword
} from '../../_lib/auth.js';

/** 특정 사용자의 모든 세션 삭제 */
async function deleteAllSessions(kv, username) {
  const target = username.toLowerCase();
  let cursor;

  do {
    const result = await kv.list({ prefix: 'session:', cursor });
    for (const key of result.keys) {
      const raw = await kv.get(key.name);
      if (raw) {
        try {
          const session = JSON.parse(raw);
          if (session.username === target) {
            await kv.delete(key.name);
          }
        } catch (e) { /* skip */ }
      }
    }
    cursor = result.list_complete ? null : result.cursor;
  } while (cursor);
}

// DELETE: 계정 완전 삭제 (user + data + sessions)
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

  const userKey = `user:${username}`;
  const dataKey = `data:${username}`;

  // 존재 확인 + 이메일 추출 (삭제 전에 미리 읽어둠)
  const existing = await env.DATA_KV.get(userKey);
  if (!existing) {
    return jsonResponse({ error: '존재하지 않는 사용자입니다' }, 404);
  }

  // 자기 자신 삭제 방지 (토큰 인증 시)
  if (admin.username && admin.username === username) {
    return jsonResponse({ error: '자기 자신의 계정은 삭제할 수 없습니다' }, 400);
  }

  // user record에서 email 추출 (이메일 인덱스 삭제용)
  let userEmail = null;
  try {
    const userRecord = JSON.parse(existing);
    userEmail = userRecord.email ? userRecord.email.toLowerCase() : null;
  } catch (e) { /* skip */ }

  // 계정 + 데이터 + 이메일 인덱스 삭제
  await env.DATA_KV.delete(userKey);
  await env.DATA_KV.delete(dataKey);
  if (userEmail) {
    await env.DATA_KV.delete(`email:${userEmail}`);
  }

  // 세션 삭제
  await deleteAllSessions(env.DATA_KV, username);

  return jsonResponse({ ok: true, deleted: username });
}

// POST: 비밀번호 재설정
export async function onRequestPost(context) {
  const { request, env } = context;

  const admin = await verifyAdmin(env.DATA_KV, request, env);
  if (!admin.ok) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: '잘못된 요청입니다' }, 400);
  }

  const username = (body.username || '').toLowerCase();
  const newPassword = body.newPassword || '';

  if (!validateUsername(username)) {
    return jsonResponse({ error: '잘못된 아이디입니다' }, 400);
  }
  if (!validatePassword(newPassword)) {
    return jsonResponse({ error: '비밀번호는 6자 이상이어야 합니다' }, 400);
  }

  const userKey = `user:${username}`;
  const raw = await env.DATA_KV.get(userKey);
  if (!raw) {
    return jsonResponse({ error: '존재하지 않는 사용자입니다' }, 404);
  }

  const user = JSON.parse(raw);

  // 새 salt + hash 생성
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltB64 = btoa(String.fromCharCode(...salt));

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(newPassword), 'PBKDF2', false, ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hash)));

  // 계정 정보 업데이트
  user.salt = saltB64;
  user.hash = hashB64;
  await env.DATA_KV.put(userKey, JSON.stringify(user));

  // 기존 세션 모두 삭제 (강제 재로그인)
  await deleteAllSessions(env.DATA_KV, username);

  return jsonResponse({ ok: true, username });
}

export async function onRequestOptions() {
  return handleOptions();
}
