/* =====================================================
   api/admin/user.js - 사용자 계정 관리
   DELETE /api/admin/user?username=xxx  → 계정+데이터+세션 전체 삭제
   POST   /api/admin/user  { username, newPassword } → 비밀번호 재설정

   인증: X-Admin-Key (마스터 키) 또는 admin 역할 Bearer 토큰
   ===================================================== */

import { requireAdmin, parseJsonBody, onRequestOptions } from '../../_lib/helpers.js';
import {
  jsonResponse,
  validateUsername, validatePassword,
  resetPassword, deleteAllSessionsForUser
} from '../../_lib/auth.js';

// DELETE: 계정 완전 삭제 (user + data(모든 페이지) + sessions)
export async function onRequestDelete(context) {
  const { request, env } = context;

  const { admin, response } = await requireAdmin(env.DATA_KV, request, env);
  if (response) return response;

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').toLowerCase();

  if (!username || !validateUsername(username)) {
    return jsonResponse({ error: 'username 파라미터가 필요합니다' }, 400, request);
  }

  const userKey = `user:${username}`;

  // 존재 확인 + 이메일 추출 (삭제 전에 미리 읽어둠)
  const existing = await env.DATA_KV.get(userKey);
  if (!existing) {
    return jsonResponse({ error: '존재하지 않는 사용자입니다' }, 404, request);
  }

  // 자기 자신 삭제 방지 (토큰 인증 시)
  if (admin.username && admin.username === username) {
    return jsonResponse({ error: '자기 자신의 계정은 삭제할 수 없습니다' }, 400, request);
  }

  // user record에서 email 추출 (이메일 인덱스 삭제용)
  let userEmail = null;
  try {
    const userRecord = JSON.parse(existing);
    userEmail = userRecord.email ? userRecord.email.toLowerCase() : null;
  } catch (e) { /* skip */ }

  // 1) 모든 서브페이지 데이터 삭제 (data:<username>:*)
  //    - 실제 저장 규칙은 3단 키이므로 prefix 순회로 전부 지운다.
  //    - 이전에는 2단 키(data:<username>)만 지워 실제 데이터가 잔존해
  //      아이디 재가입 시 이전 사용자 데이터를 넘겨받는 문제가 있었다.
  let deletedDataKeys = 0;
  let cursor = null;
  do {
    const list = await env.DATA_KV.list({ prefix: `data:${username}:`, cursor });
    for (const key of list.keys) {
      await env.DATA_KV.delete(key.name);
      deletedDataKeys++;
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  // 2) 레거시 2단 키 + 세션 인덱스 장부 삭제
  await env.DATA_KV.delete(`data:${username}`);
  await env.DATA_KV.delete(`user_sessions:${username}`);

  // 3) 계정 + 이메일 인덱스 삭제
  await env.DATA_KV.delete(userKey);
  if (userEmail) {
    await env.DATA_KV.delete(`email:${userEmail}`);
  }

  // 4) 세션 삭제 (공통 함수 사용)
  await deleteAllSessionsForUser(env.DATA_KV, username);

  return jsonResponse({ ok: true, deleted: username, deletedDataKeys }, 200, request);
}

// POST: 비밀번호 재설정
export async function onRequestPost(context) {
  const { request, env } = context;

  const { admin, response: authErr } = await requireAdmin(env.DATA_KV, request, env);
  if (authErr) return authErr;

  const { body, response: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const username = (body.username || '').toLowerCase();
  const newPassword = body.newPassword || '';

  if (!validateUsername(username)) {
    return jsonResponse({ error: '잘못된 아이디입니다' }, 400, request);
  }
  if (!validatePassword(newPassword)) {
    return jsonResponse({ error: '비밀번호는 8자 이상 128자 이하로 입력해주세요' }, 400, request);
  }

  const userKey = `user:${username}`;
  const raw = await env.DATA_KV.get(userKey);
  if (!raw) {
    return jsonResponse({ error: '존재하지 않는 사용자입니다' }, 404, request);
  }

  // resetPassword 사용 (inline PBKDF2 중복 제거)
  const result = await resetPassword(env.DATA_KV, username, newPassword);
  if (result.error) {
    return jsonResponse({ error: result.error }, 500, request);
  }

  // 기존 세션 모두 삭제 (강제 재로그인)
  await deleteAllSessionsForUser(env.DATA_KV, username);

  return jsonResponse({ ok: true, username }, 200, request);
}

export { onRequestOptions };
