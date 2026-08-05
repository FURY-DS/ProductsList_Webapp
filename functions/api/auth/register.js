/* =====================================================
   api/auth/register.js - 회원가입
   POST /api/auth/register  { username, password, name, email } → { token, username, role }

   모든 신규 가입자는 role: "user"
   ===================================================== */

import { parseJsonBody, checkRateLimit, recordAttempt, ipScope, onRequestOptions } from '../../_lib/helpers.js';
import {
  createUser, createSession,
  validateUsername, validatePassword, validateName, validateEmail,
  jsonResponse
} from '../../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const { body, response: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const { username, password, name, email } = body;

  if (!validateUsername(username)) {
    return jsonResponse({ error: '아이디는 3~20자의 영문/숫자/언더스코어만 가능합니다' }, 400);
  }

  if (!validatePassword(password)) {
    return jsonResponse({ error: '비밀번호는 6자 이상이어야 합니다' }, 400);
  }

  if (!validateName(name)) {
    return jsonResponse({ error: '이름은 1~20자, 한글/영문/숫자/공백/-/_/. 만 가능합니다' }, 400);
  }

  if (!validateEmail(email)) {
    return jsonResponse({ error: '올바른 이메일 형식이 아닙니다' }, 400);
  }

  const ip = ipScope(request);

  const { limited, response: limitRes } = await checkRateLimit(
    env.DATA_KV, 'register', ip,
    '가입 시도가 너무 많습니다. 잠시 후 다시 시도해주세요'
  );
  if (limitRes) return limitRes;
  await recordAttempt(env.DATA_KV, 'register', ip);

  const result = await createUser(env.DATA_KV, username, password, name.trim(), email);
  if (result.error) {
    return jsonResponse({ error: result.error }, 409);
  }

  const token = await createSession(env.DATA_KV, result.username);

  return jsonResponse({
    token,
    username: result.username,
    role: result.role || 'user'
  });
}

export { onRequestOptions };
