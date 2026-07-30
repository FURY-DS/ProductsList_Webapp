/* =====================================================
   auth.js - 사용자 인증 모듈
   회원가입 / 로그인 / 로그아웃 / 세션 확인

   토큰은 localStorage에 저장, 30일간 유효 (서버 TTL)
   ===================================================== */

const Auth = {
  token: null,
  username: null,

  /** 초기화 - localStorage에서 토큰 복원 */
  init() {
    this.token = localStorage.getItem('auth_token') || null;
    this.username = localStorage.getItem('auth_username') || null;
  },

  /** 인증 여부 */
  isAuthenticated() {
    return !!this.token;
  },

  /** 회원가입 */
  async register(username, password) {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, msg: data.error || '회원가입 실패' };
      }
      this._setSession(data.token, data.username);
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: '네트워크 오류: ' + e.message };
    }
  },

  /** 로그인 */
  async login(username, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, msg: data.error || '로그인 실패' };
      }
      this._setSession(data.token, data.username);
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: '네트워크 오류: ' + e.message };
    }
  },

  /** 로그아웃 */
  async logout() {
    if (this.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
      } catch (e) { /* ignore */ }
    }
    this._clearSession();
  },

  /** 세션 유효성 확인 (서버에 검증) */
  async checkSession() {
    if (!this.token) return false;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.username) {
          this.username = data.username;
          return true;
        }
      }
      // 세션 만료
      this._clearSession();
      return false;
    } catch (e) {
      // 네트워크 오류 - 토큰 유지 (오프라인에서 localStorage 데이터 사용)
      return true;
    }
  },

  /** Authorization 헤더 객체 반환 */
  getAuthHeader() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  },

  /** 세션 저장 (내부) */
  _setSession(token, username) {
    this.token = token;
    this.username = username;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_username', username);
    // 기존 cloud_auth_key 제거 (마이그레이션)
    localStorage.removeItem('cloud_auth_key');
  },

  /** 세션 삭제 (내부) */
  _clearSession() {
    this.token = null;
    this.username = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    localStorage.removeItem('cloud_auth_key');
  }
};
