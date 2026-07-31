/* =====================================================
   api/auth/find-id-verify.js - 아이디 찾기 (2단계: 인증번호 검증)
   POST /api/auth/find-id/verify  { name, email, code } → { username, maskedEmail }

   - 인증번호 일치 시 username 반환 + KV에서 코드 삭제 (일회용)
   - 실패 시 동일한 에러 (사용자/코드 정보 노출 방지)
   ===================================================== */

import {
  validateName, validateEmail,
  verifyAndConsumeCode,
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

  const { name, email, code } = body;

  if (!validateName(name)) {
    return jsonResponse({ error: '입력값이 올바르지 않습니다' }, 400);
  }
  if (!validateEmail(email)) {
    return jsonResponse({ error: '입력값이 올바르지 않습니다' }, 400);
  }
  if (!code || String(code).length !== 6) {
    return jsonResponse({ error: '인증번호 6자리를 입력해주세요' }, 400);
  }

  const ip = getClientIp(request);
  if (await isRateLimited(env.DATA_KV, 'findid_verify', ip)) {
    return jsonResponse({ error: '시도가 너무 많습니다. 잠시 후 다시 시도해주세요' }, 429);
  }

  // 인증번호 검증 (성공 시 자동 삭제)
  const scope = email.toLowerCase();
  const result = await verifyAndConsumeCode(env.DATA_KV, 'findid', scope, String(code));

  if (result.error) {
    await recordAttempt(env.DATA_KV, 'findid_verify', ip);
    return jsonResponse({ error: result.error }, 401);
  }

  // 이름이 일치하는지 추가 확인 (이메일 + 코드만으로는 부족)
  // 코드 저장 시 username만 저장하므로 user 레코드를 다시 조회
  const userRaw = await env.DATA_KV.get(`user:${result.username}`);
  if (!userRaw) {
    return jsonResponse({ error: '사용자 정보를 찾을 수 없습니다' }, 404);
  }
  const user = JSON.parse(userRaw);
  if (user.name !== name.trim()) {
    await recordAttempt(env.DATA_KV, 'findid_verify', ip);
    return jsonResponse({ error: '입력하신 정보가 일치하지 않습니다' }, 401);
  }

  // 응답: username + 마스킹된 이메일 (본인 확인용)
  const maskedEmail = maskEmail(user.email);

  return jsonResponse({
    username: user.username,
    maskedEmail
  });
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

export async function onRequestOptions() {
  return handleOptions();
}
