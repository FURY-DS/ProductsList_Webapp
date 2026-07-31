/* =====================================================
   api/auth/find-id.js - 아이디 찾기 (1단계: 인증번호 발송)
   POST /api/auth/find-id  { name, email } → { sent, devCode? }

   - 사용자가 존재하지 않아도 동일한 응답 반환 (사용자 열거 방지)
   - 인증번호는 KV에 5분간 저장
   - dev mode (RESEND_API_KEY 미설정) 시 devCode를 응답에 포함
   ===================================================== */

import {
  validateName, validateEmail,
  findUserByNameAndEmail,
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

  const { name, email } = body;

  if (!validateName(name)) {
    return jsonResponse({ error: '이름을 올바르게 입력해주세요' }, 400);
  }

  if (!validateEmail(email)) {
    return jsonResponse({ error: '올바른 이메일 형식이 아닙니다' }, 400);
  }

  const ip = getClientIp(request);

  if (await isRateLimited(env.DATA_KV, 'findid_request', ip)) {
    return jsonResponse({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요' }, 429);
  }

  // 사용자 조회 (없어도 동일한 응답)
  const user = await findUserByNameAndEmail(env.DATA_KV, name, email);
  const genericResponse = { sent: true };

  if (!user) {
    // 사용자가 없어도 동일한 응답 (열거 방지)
    // 단, 카운터는 늘리지 않음 (남용 방지 + 정상 사용자가 잠기지 않게)
    return jsonResponse(genericResponse);
  }

  await recordAttempt(env.DATA_KV, 'findid_request', ip);

  // 인증번호 생성 + 저장 (이메일을 키의 일부로 — 같은 이메일로 중복 발송 시 덮어쓰기)
  const code = generateVerificationCode();
  const scope = email.toLowerCase();
  await storeVerificationCode(env.DATA_KV, 'findid', scope, code, user.username);

  // 이메일 발송
  const subject = '[상품리스트] 아이디 찾기 인증번호';
  const text = buildVerificationEmailBody('findid', user.name, code);
  const result = await sendEmail(env, user.email, subject, text);

  if (!result.ok) {
    return jsonResponse({ error: result.error || '이메일 발송에 실패했습니다' }, 500);
  }

  // dev mode에서는 인증번호를 응답에 포함 (테스트용)
  if (result.devMode && result.devCode) {
    return jsonResponse({ sent: true, devCode: result.devCode });
  }

  return jsonResponse(genericResponse);
}

export async function onRequestOptions() {
  return handleOptions();
}
