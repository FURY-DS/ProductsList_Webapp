/* =====================================================
   api/auth/find-pw-verify.js - 비밀번호 찾기 (2단계: 인증번호 + 새 비밀번호)
   POST /api/auth/find-pw/verify
     { name, username, email, code, newPassword } → { ok }

   - 인증번호 검증 + 새 비밀번호 해시 업데이트
   - 모든 기존 세션 무효화 (탈취된 세션 차단)
   ===================================================== */

import {
  validateName, validateUsername, validateEmail, validatePassword,
  verifyAndConsumeCode, resetPassword, deleteAllSessionsForUser,
  findUserByNameUsernameAndEmail,
  getClientIp, isRateLimited, recordAttempt,
  jsonResponse, handleOptions
} from '../../../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: '잘못된 요청입니다' }, 400);
  }

  const { name, username, email, code, newPassword } = body;

  if (!validateName(name) || !validateUsername(username) || !validateEmail(email)) {
    return jsonResponse({ error: '입력값이 올바르지 않습니다' }, 400);
  }
  if (!code || String(code).length !== 6) {
    return jsonResponse({ error: '인증번호 6자리를 입력해주세요' }, 400);
  }
  if (!validatePassword(newPassword)) {
    return jsonResponse({ error: '새 비밀번호는 6자 이상이어야 합니다' }, 400);
  }

  const ip = getClientIp(request);
  if (await isRateLimited(env.DATA_KV, 'findpw_verify', ip)) {
    return jsonResponse({ error: '시도가 너무 많습니다. 잠시 후 다시 시도해주세요' }, 429);
  }

  // 1) 인증번호 검증
  const scope = `${username.toLowerCase()}:${email.toLowerCase()}`;
  const codeResult = await verifyAndConsumeCode(env.DATA_KV, 'findpw', scope, String(code));
  if (codeResult.error) {
    await recordAttempt(env.DATA_KV, 'findpw_verify', ip);
    return jsonResponse({ error: codeResult.error }, 401);
  }

  // 2) 인증번호로 얻은 username과 요청의 username이 일치하는지 확인
  if (codeResult.username !== username.toLowerCase()) {
    await recordAttempt(env.DATA_KV, 'findpw_verify', ip);
    return jsonResponse({ error: '입력하신 정보가 일치하지 않습니다' }, 401);
  }

  // 3) 이름까지 일치하는지 한 번 더 (이름은 코드 발급 시점과 변경 가능성 없으므로 안전)
  const user = await findUserByNameUsernameAndEmail(env.DATA_KV, name, username, email);
  if (!user) {
    await recordAttempt(env.DATA_KV, 'findpw_verify', ip);
    return jsonResponse({ error: '입력하신 정보가 일치하지 않습니다' }, 401);
  }

  // 4) 비밀번호 재설정
  const resetResult = await resetPassword(env.DATA_KV, username, newPassword);
  if (resetResult.error) {
    return jsonResponse({ error: resetResult.error }, 500);
  }

  // 5) 해당 사용자의 모든 세션 삭제 (탈취된 세션 차단)
  const deletedSessions = await deleteAllSessionsForUser(env.DATA_KV, username);

  return jsonResponse({
    ok: true,
    invalidatedSessions: deletedSessions
  });
}

export async function onRequestOptions() {
  return handleOptions();
}
