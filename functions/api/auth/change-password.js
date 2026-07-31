/* =====================================================
   api/auth/change-password.js - 비밀번호 변경 (로그인 상태)
   POST /api/auth/change-password (Bearer)
     { oldPassword, newPassword } → { ok }

   - Bearer 토큰으로 인증된 사용자만 가능
   - 현재 비밀번호 검증 후 새 비밀번호로 변경
   - 다른 기기 세션도 모두 무효화 (선택: 본인 세션은 유지)
   ===================================================== */

import {
  verifySession, extractToken,
  validatePassword, changePassword, deleteAllSessionsForUser,
  isRateLimited, recordAttempt,
  jsonResponse, handleOptions
} from '../../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1) 세션 확인
  const session = await verifySession(env.DATA_KV, request);
  if (!session) {
    return jsonResponse({ error: '로그인이 필요합니다' }, 401);
  }

  // 2) 입력값 파싱
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: '잘못된 요청입니다' }, 400);
  }

  const { oldPassword, newPassword } = body;

  if (!oldPassword) {
    return jsonResponse({ error: '현재 비밀번호를 입력해주세요' }, 400);
  }
  if (!validatePassword(newPassword)) {
    return jsonResponse({ error: '새 비밀번호는 6자 이상이어야 합니다' }, 400);
  }
  if (oldPassword === newPassword) {
    return jsonResponse({ error: '새 비밀번호는 현재 비밀번호와 달라야 합니다' }, 400);
  }

  // 3) Rate limit (사용자별)
  const scope = session.username;
  if (await isRateLimited(env.DATA_KV, 'change_password', scope)) {
    return jsonResponse({ error: '시도가 너무 많습니다. 잠시 후 다시 시도해주세요' }, 429);
  }

  // 4) 비밀번호 변경
  const result = await changePassword(env.DATA_KV, session.username, oldPassword, newPassword);
  if (result.error) {
    await recordAttempt(env.DATA_KV, 'change_password', scope);
    return jsonResponse({ error: result.error }, 401);
  }

  // 5) 본인 세션 토큰은 유지하고, 다른 세션만 무효화
  const currentToken = extractToken(request);
  await deleteOtherSessionsForUser(env.DATA_KV, session.username, currentToken);

  return jsonResponse({ ok: true });
}

/**
 * 특정 사용자의 세션 중, currentToken을 제외한 나머지를 삭제
 */
async function deleteOtherSessionsForUser(kv, username, currentToken) {
  const target = username.toLowerCase();
  let cursor = null;
  let deleted = 0;
  do {
    const list = await kv.list({ prefix: 'session:', cursor });
    for (const key of list.keys) {
      // 현재 토큰은 건너뛰기
      if (key.name === `session:${currentToken}`) continue;
      try {
        const raw = await kv.get(key.name);
        if (!raw) continue;
        const session = JSON.parse(raw);
        if (session.username === target) {
          await kv.delete(key.name);
          deleted++;
        }
      } catch (e) { /* 손상된 세션 무시 */ }
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  return deleted;
}

export async function onRequestOptions() {
  return handleOptions();
}
