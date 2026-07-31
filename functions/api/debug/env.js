/* =====================================================
   api/debug/env.js - 환경변수 상태 확인 (디버그용)
   GET /api/debug/env → { gasUrl, gasSecret, resendKey, allEnvKeys }
   ===================================================== */

export async function onRequestGet(context) {
  const { env } = context;

  return new Response(JSON.stringify({
    gasUrl: env.GAS_WEBHOOK_URL ? 'SET' : 'NOT_SET',
    gasSecret: env.GAS_SECRET ? 'SET' : 'NOT_SET',
    resendKey: env.RESEND_API_KEY ? 'SET' : 'NOT_SET',
    resendFromEmail: env.RESEND_FROM_EMAIL ? 'SET' : 'NOT_SET',
    allEnvKeys: Object.keys(env).sort()
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
