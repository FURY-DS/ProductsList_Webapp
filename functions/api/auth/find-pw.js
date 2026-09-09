/* =====================================================
   api/auth/find-pw.js - 비밀번호 찾기 (1단계: 인증번호 발송)
   POST /api/auth/find-pw  { name, username, email } → { sent, devCode? }

   - 이름+아이디+이메일이 모두 일치해야 인증번호 발송
   - 일치하지 않아도 동일한 응답 (정보 노출 방지)
   ===================================================== */

import { parseJsonBody, checkRateLimit, recordAttempt, ipScope, onRequestOptions } from '../../_lib/helpers.js';
import {
  validateName, validateUsername, validateEmail,
  findUserByNameUsernameAndEmail,
  generateVerificationCode, storeVerificationCode,
  jsonResponse
} from '../../_lib/auth.js';
import { sendEmail, buildVerificationEmailBody } from '../../_lib/email.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const { body, response: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

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

  const ip = ipScope(request);

  const { limited, response: limitRes } = await checkRateLimit(
    env.DATA_KV, 'findpw_request', ip,
    '요청이 너무 많습니다. 잠시 후 다시 시도해주세요'
  );
  if (limitRes) return limitRes;

  const genericResponse = { sent: true };

  // 사용자 존재 여부와 무관하게 카운터를 증가한다.
  // (존재할 때만 증가하면 429 응답 코드 자체가 계정 열거 오라클이 된다)
  await recordAttempt(env.DATA_KV, 'findpw_request', ip);

  const user = await findUserByNameUsernameAndEmail(env.DATA_KV, name, username, email);

  if (!user) {
    // 사용자가 없어도 동일한 응답
    return jsonResponse(genericResponse, 200, request);
  }

  // scope: username + email 조합 (같은 username에 다른 이메일이 매칭되지 않게)
  const scope = `${username.toLowerCase()}:${email.toLowerCase()}`;
  const code = generateVerificationCode();
  await storeVerificationCode(env.DATA_KV, 'findpw', scope, code, user.username);

  const subject = '[마켓노트] 비밀번호 찾기 인증번호';
  const { text, html } = buildVerificationEmailBody('findpw', user.name, code);
  const result = await sendEmail(env, user.email, subject, text, html);

  if (!result.ok) {
    return jsonResponse({ error: result.error || '이메일 발송에 실패했습니다' }, 500, request);
  }

  // 보안: dev mode에서도 인증번호를 API 응답에 포함하지 않는다 — 인증번호는 오직 이메일로만 전달
  return jsonResponse(genericResponse, 200, request);
}

export { onRequestOptions };
