/* =====================================================
   _lib/email.js - 이메일 발송 (Resend API)
   RESEND_API_KEY가 없으면 dev mode로 동작 (인증번호를 응답에 포함)
   ===================================================== */

/**
 * 이메일 발송
 * @returns { ok, devCode?, error? }
 *   - dev mode에서는 devCode에 인증번호를 넣어 반환 (테스트용)
 *   - 실 발송 시 RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME 필요
 */
export async function sendEmail(env, to, subject, text) {
  const apiKey = env.RESEND_API_KEY;
  const fromEmail = env.RESEND_FROM_EMAIL;
  const fromName = env.RESEND_FROM_NAME || '상품리스트';

  // === dev mode: API 키 미설정 ===
  if (!apiKey) {
    // 인증번호가 본문에 포함된 경우 추출 (간단한 패턴)
    const codeMatch = text.match(/(\d{6})/);
    const devCode = codeMatch ? codeMatch[1] : null;
    console.log('[email:dev mode] RESEND_API_KEY 미설정 — 메일 발송 스킵');
    console.log('[email:dev mode] to:', to);
    console.log('[email:dev mode] subject:', subject);
    if (devCode) console.log('[email:dev mode] dev code:', devCode);
    return { ok: true, devMode: true, devCode };
  }

  if (!fromEmail) {
    return { ok: false, error: 'RESEND_FROM_EMAIL이 설정되지 않았습니다' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        text
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[email:Resend] 발송 실패:', res.status, errText);
      return { ok: false, error: `이메일 발송 실패 (HTTP ${res.status})` };
    }

    return { ok: true };
  } catch (e) {
    console.error('[email:Resend] 네트워크 오류:', e);
    return { ok: false, error: '이메일 발송 중 네트워크 오류' };
  }
}

/**
 * 인증번호 이메일 본문 생성 (한국어)
 */
export function buildVerificationEmailBody(purpose, name, code) {
  const titles = {
    findid: '아이디 찾기',
    findpw: '비밀번호 찾기'
  };
  const title = titles[purpose] || '계정 찾기';

  return `[상품리스트] ${title} 인증번호

안녕하세요, ${name}님.

요청하신 ${title} 인증번호는 다음과 같습니다.

  인증번호: ${code}

이 인증번호는 5분 동안만 유효하며, 한 번만 사용할 수 있어요.
본인이 요청하지 않았다면 이 이메일을 무시해주세요.

— 상품리스트
`;
}
