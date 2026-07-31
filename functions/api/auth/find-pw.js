/* =====================================================
   api/auth/find-pw.js - 비밀번호 찾기 (1단계: 인증번호 발송)
   POST /api/auth/find-pw  { name, username, email } → { sent, devCode? }

   - 이름+아이디+이메일이 모두 일치해야 인증번호 발송
   - 일치하지 않아도 동일한 응답 (정보 노출 방지)
   ===================================================== */

import {
  validateName, validateUsername, validateEmail,
  findUserByNameUsernameAndEmail,
  generateVerificationCode, storeVerificationCode,
  getClientIp, isRateLimited, recordAttempt,
  jsonResponse, handleOptions
} from '../../_lib/auth.js';
import { sendEmail, buildVerificationEmailBody } from '../../_lib/email.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: '잘못된 요청입니다' }, 400);
  }

  const { name, username, email } = body;

  if (!validateName(name)) {
    return jsonResponse({ error: '이름을 올바르게 입력해주세요' }, 400);
  }
  if (!validateUsername(username)) {
    return jsonResponse({ error: '아이디를 올바르게 입력해주세요' }, 400);
  }
  if (!validateEmail(email)) {
    return jsonResponse({ error: '올바른 이메일 형식이 아닙니다' }, 400);
  }

  const ip = getClientIp(request);

  if (await isRateLimited(env.DATA_KV, 'findpw_request', ip)) {
    return jsonResponse({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요' }, 429);
  }

  const user = await findUserByNameUsernameAndEmail(env.DATA_KV, name, username, email);
  const genericResponse = { sent: true };

  if (!user) {
    // 사용자가 없어도 동일한 응답
    return jsonResponse(genericResponse);
  }

  await recordAttempt(env.DATA_KV, 'findpw_request', ip);

  // scope: username + email 조합 (같은 username에 다른 이메일이 매칭되지 않게)
  const scope = `${username.toLowerCase()}:${email.toLowerCase()}`;
  const code = generateVerificationCode();
  await storeVerificationCode(env.DATA_KV, 'findpw', scope, code, user.username);

  const subject = '[상품리스트] 비밀번호 찾기 인증번호';
  const { text, html } = buildVerificationEmailBody('findpw', user.name, code);
  const result = await sendEmail(env, user.email, subject, text, html);

  if (!result.ok) {
    return jsonResponse({ error: result.error || '이메일 발송에 실패했습니다' }, 500);
  }

  if (result.devMode && result.devCode) {
    return jsonResponse({ sent: true, devCode: result.devCode });
  }

  return jsonResponse(genericResponse);
}

export async function onRequestOptions() {
  return handleOptions();
}
