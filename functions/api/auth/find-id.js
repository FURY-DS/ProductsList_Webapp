/* =====================================================
   api/auth/find-id.js - 아이디 찾기 (1단계: 인증번호 발송)
   POST /api/auth/find-id  { name, email } → { sent, devCode? }

   - 사용자가 존재하지 않아도 동일한 응답 반환 (사용자 열거 방지)
   - 인증번호는 KV에 5분간 저장
   - dev mode (RESEND_API_KEY 미설정) 시 devCode를 응답에 포함
   ===================================================== */

import { parseJsonBody, checkRateLimit, recordAttempt, ipScope, onRequestOptions } from '../../_lib/helpers.js';
import {
  validateName, validateEmail,
  findUserByNameAndEmail,
  generateVerificationCode, storeVerificationCode,
  jsonResponse
} from '../../_lib/auth.js';
import { sendEmail, buildVerificationEmailBody } from '../../_lib/email.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const { body, response: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const { name, email } = body;

  if (!validateName(name)) {
    return jsonResponse({ error: '이름을 올바르게 입력해주세요' }, 400);
  }

  if (!validateEmail(email)) {
    return jsonResponse({ error: '올바른 이메일 형식이 아닙니다' }, 400);
  }

  const ip = ipScope(request);

  const { limited, response: limitRes } = await checkRateLimit(
    env.DATA_KV, 'findid_request', ip,
    '요청이 너무 많습니다. 잠시 후 다시 시도해주세요'
  );
  if (limitRes) return limitRes;

  // 사용자 존재 여부와 무관하게 카운터를 증가한다.
  // (존재할 때만 증가하면 429 응답 코드 자체가 계정 열거 오라클이 된다)
  await recordAttempt(env.DATA_KV, 'findid_request', ip);

  const genericResponse = { sent: true };

  // 사용자 조회 (없어도 동일한 응답)
  const user = await findUserByNameAndEmail(env.DATA_KV, name, email);

  if (!user) {
    // 사용자가 없어도 동일한 응답 (열거 방지)
    return jsonResponse(genericResponse, 200, request);
  }

  // 인증번호 생성 + 저장 (이메일을 키의 일부로 — 같은 이메일로 중복 발송 시 덮어쓰기)
  const code = generateVerificationCode();
  const scope = email.toLowerCase();
  await storeVerificationCode(env.DATA_KV, 'findid', scope, code, user.username);

  // 이메일 발송
  const subject = '[마켓노트] 아이디 찾기 인증번호';
  const { text, html } = buildVerificationEmailBody('findid', user.name, code);
  const result = await sendEmail(env, user.email, subject, text, html);

  if (!result.ok) {
    return jsonResponse({ error: result.error || '이메일 발송에 실패했습니다' }, 500, request);
  }

  // 보안: dev mode에서도 인증번호를 API 응답에 포함하지 않는다.
  // (환경변수 설정 실수로 운영에서 dev mode가 되면 계정 탈취로 이어짐) — 인증번호는 오직 이메일로만 전달
  return jsonResponse(genericResponse, 200, request);
}

export { onRequestOptions };
