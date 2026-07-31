/* =====================================================
   api/debug/users.js - 사용자 목록 확인 (디버그용, 인증 없음)
   GET /api/debug/users → { users: [...] }
   ===================================================== */

export async function onRequestGet(context) {
  const { env } = context;

  const users = [];
  let cursor;

  do {
    const result = await env.DATA_KV.list({ prefix: 'user:', cursor });
    for (const key of result.keys) {
      const raw = await env.DATA_KV.get(key.name);
      if (raw) {
        try {
          const user = JSON.parse(raw);
          users.push({
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role
          });
        } catch (e) {}
      }
    }
    cursor = result.cursor;
  } while (cursor);

  return new Response(JSON.stringify({ users }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
