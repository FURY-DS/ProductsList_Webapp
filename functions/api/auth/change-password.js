/* =====================================================
   api/auth/change-password.js - 비밀번호 변경 (로그인 상태)
   POST /api/auth/change-password (Bearer)
     { oldPassword, newPassword } → { ok }

   - Bearer 토큰으로 인증된 사용자만 가능
   - 현재 비밀번호 검증 후 새 비밀번호로 변경
   - 다른 기기 세션도 모두 무효화 (본인 세션은 유지)
   ===================================================== */

import { requireAuth, parseJsonBody, checkRateLimit, recordAttempt, onRequestOptions } from '../../_lib/helpers.js';
import {
  extractToken, validatePassword, changePassword,
  deleteAllSessionsForUser,
  jsonResponse
} from '../../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1) 세션 확인
  const { session, response: authErr } = await requireAuth(env.DATA_KV, request, '로그인이 필요합니다');
  if (authErr) return authErr;

  // 2) 입력값 파싱
  const { body, response: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

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
  const { limited, response: limitRes } = await checkRateLimit(
    env.DATA_KV, 'change_password', scope,
    '시도가 너무 많습니다. 잠시 후 다시 시도해주세요'
  );
  if (limitRes) return limitRes;

  // 4) 비밀번호 변경
  const result = await changePassword(env.DATA_KV, session.username, oldPassword, newPassword);
  if (result.error) {
    await recordAttempt(env.DATA_KV, 'change_password', scope);
    return jsonResponse({ error: result.error }, 401);
  }

  // 5) 본인 세션 토큰은 유지하고, 다른 세션만 무효화
  const currentToken = extractToken(request);
  await deleteAllSessionsForUser(env.DATA_KV, session.username, currentToken);

  return jsonResponse({ ok: true });
}

export { onRequestOptions };
