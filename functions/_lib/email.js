/* =====================================================
   _lib/email.js - 이메일 발송 (Google Apps Script / Resend)
   
   우선순위:
   1. GAS_WEBHOOK_URL 설정 → 구글 앱스스크립트(Gmail)로 발송
   2. RESEND_API_KEY 설정 → Resend API로 발송
   3. 둘 다 없음 → dev mode (인증번호를 응답에 포함)
   ===================================================== */

/**
 * 이메일 발송
 * @returns { ok, devCode?, error? }
 *   - dev mode에서는 devCode에 인증번호를 넣어 반환 (테스트용)
 *   - GAS 모드: GAS_WEBHOOK_URL, GAS_SECRET 필요
 *   - Resend 모드: RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME 필요
 */
export async function sendEmail(env, to, subject, text, html) {
  // === 1순위: Google Apps Script (Gmail) ===
  const gasUrl = env.GAS_WEBHOOK_URL;
  const gasSecret = env.GAS_SECRET;

  if (gasUrl && gasSecret) {
    try {
      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: gasSecret,
          to: to,
          subject: subject,
          body: text,
          html: html || text,
          fromName: env.RESEND_FROM_NAME || '상품리스트'
        })
      });

      const data = await res.json();
      if (data.ok) {
        return { ok: true, method: 'gas' };
      }
      console.error('[email:GAS] 발송 실패:', data.error);
      return { ok: false, error: '이메일 발송 실패 (GAS)' };
    } catch (e) {
      console.error('[email:GAS] 네트워크 오류:', e);
      return { ok: false, error: '이메일 발송 중 네트워크 오류 (GAS)' };
    }
  }

  // === 2순위: Resend API ===
  const apiKey = env.RESEND_API_KEY;
  const fromEmail = env.RESEND_FROM_EMAIL;
  const fromName = env.RESEND_FROM_NAME || '상품리스트';

  if (apiKey) {
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
          text,
          ...(html ? { html } : {})
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[email:Resend] 발송 실패:', res.status, errText);
        return { ok: false, error: `이메일 발송 실패 (HTTP ${res.status})` };
      }

      return { ok: true, method: 'resend' };
    } catch (e) {
      console.error('[email:Resend] 네트워크 오류:', e);
      return { ok: false, error: '이메일 발송 중 네트워크 오류' };
    }
  }

  // === 3순위: dev mode (API 키 미설정) ===
  const codeMatch = text.match(/(\d{6})/);
  const devCode = codeMatch ? codeMatch[1] : null;
  console.log('[email:dev mode] GAS_WEBHOOK_URL, RESEND_API_KEY 모두 미설정 — 메일 발송 스킵');
  console.log('[email:dev mode] to:', to);
  console.log('[email:dev mode] subject:', subject);
  if (devCode) console.log('[email:dev mode] dev code:', devCode);
  return { ok: true, devMode: true, devCode };
}

/**
 * 인증번호 이메일 본문 생성 (한국어)
 * 텍스트와 HTML 두 가지 버전 반환
 */
export function buildVerificationEmailBody(purpose, name, code) {
  const titles = {
    findid: '아이디 찾기',
    findpw: '비밀번호 찾기'
  };
  const title = titles[purpose] || '계정 찾기';

  const text = `[상품리스트] ${title} 인증번호

안녕하세요, ${name}님.

요청하신 ${title} 인증번호는 다음과 같습니다.

  인증번호: ${code}

이 인증번호는 5분 동안만 유효하며, 한 번만 사용할 수 있어요.
본인이 요청하지 않았다면 이 이메일을 무시해주세요.

— 상품리스트
`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center;">
    <h2 style="color: #333; margin-bottom: 8px;">상품리스트</h2>
    <p style="color: #666; font-size: 14px; margin-bottom: 24px;">${title} 인증번호</p>
    <p style="color: #333; font-size: 15px;">안녕하세요, <strong>${name}</strong>님.</p>
    <p style="color: #333; font-size: 15px; margin-bottom: 24px;">요청하신 인증번호입니다.</p>
    <div style="background: #fff; border: 2px solid #4F46E5; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="font-size: 13px; color: #666; margin: 0 0 8px;">인증번호</p>
      <p style="font-size: 36px; font-weight: bold; color: #4F46E5; letter-spacing: 8px; margin: 0;">${code}</p>
    </div>
    <p style="color: #999; font-size: 12px; margin-top: 24px;">
      이 인증번호는 5분 동안만 유효하며, 한 번만 사용할 수 있습니다.<br>
      본인이 요청하지 않았다면 이 이메일을 무시해주세요.
    </p>
  </div>
</body>
</html>`;

  return { text, html };
}
