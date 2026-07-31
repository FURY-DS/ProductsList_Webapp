/* =====================================================
   auth.js - 사용자 인증 모듈
   회원가입 / 로그인 / 로그아웃 / 세션 확인

   자동로그인 ON  → 토큰을 localStorage에 저장 (브라우저 재시작 후에도 유지, 30일)
   자동로그인 OFF → 토큰을 sessionStorage에 저장 (탭 닫으면 삭제)
   비밀번호 저장  → 아이디/비밀번호를 localStorage에 저장 (폼 자동 채움)
   ===================================================== */

const Auth = {
  token: null,
  username: null,
  role: null,

  /** 초기화 - localStorage 또는 sessionStorage에서 토큰 복원 */
  init() {
    this.token =
      localStorage.getItem('auth_token') ||
      sessionStorage.getItem('auth_token') ||
      null;
    this.username =
      localStorage.getItem('auth_username') ||
      sessionStorage.getItem('auth_username') ||
      null;
    this.role =
      localStorage.getItem('auth_role') ||
      sessionStorage.getItem('auth_role') ||
      null;
  },

  /** 인증 여부 */
  isAuthenticated() {
    return !!this.token;
  },

  /** 관리자 여부 */
  isAdmin() {
    return this.role === 'admin';
  },

  /** 회원가입 */
  async register(username, password, name, email, options = {}) {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name, email })
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, msg: data.error || '회원가입 실패' };
      }
      this._setSession(data.token, data.username, data.role || 'user', options.autoLogin !== false);
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: '네트워크 오류: ' + e.message };
    }
  },

  // =====================================================
  //  아이디 찾기 (이메일 인증번호)
  // =====================================================

  /** 1단계: 인증번호 발송 요청 */
  async findIdRequest(name, email) {
    try {
      const res = await fetch('/api/auth/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, msg: data.error || '인증번호 발송 실패' };
      }
      return { ok: true, devCode: data.devCode || null };
    } catch (e) {
      return { ok: false, msg: '네트워크 오류: ' + e.message };
    }
  },

  /** 2단계: 인증번호 검증 → username 반환 */
  async findIdVerify(name, email, code) {
    try {
      const res = await fetch('/api/auth/find-id/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, code })
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, msg: data.error || '인증 실패' };
      }
      return { ok: true, username: data.username, maskedEmail: data.maskedEmail };
    } catch (e) {
      return { ok: false, msg: '네트워크 오류: ' + e.message };
    }
  },

  // =====================================================
  //  비밀번호 찾기 (이메일 인증번호 → 새 비밀번호)
  // =====================================================

  /** 1단계: 인증번호 발송 요청 */
  async findPasswordRequest(name, username, email) {
    try {
      const res = await fetch('/api/auth/find-pw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email })
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, msg: data.error || '인증번호 발송 실패' };
      }
      return { ok: true, devCode: data.devCode || null };
    } catch (e) {
      return { ok: false, msg: '네트워크 오류: ' + e.message };
    }
  },

  /** 2단계: 인증번호 + 새 비밀번호 → 재설정 */
  async findPasswordVerify(name, username, email, code, newPassword) {
    try {
      const res = await fetch('/api/auth/find-pw/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, code, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, msg: data.error || '비밀번호 재설정 실패' };
      }
      return { ok: true, invalidatedSessions: data.invalidatedSessions || 0 };
    } catch (e) {
      return { ok: false, msg: '네트워크 오류: ' + e.message };
    }
  },

  // =====================================================
  //  비밀번호 변경 (로그인 상태)
  // =====================================================

  /** 현재 세션으로 비밀번호 변경 (현재 비번 검증 필요) */
  async changePassword(oldPassword, newPassword) {
    if (!this.token) {
      return { ok: false, msg: '로그인이 필요합니다' };
    }
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, msg: data.error || '비밀번호 변경 실패' };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: '네트워크 오류: ' + e.message };
    }
  },

  /** 로그인 */
  async login(username, password, options = {}) {
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
      this._setSession(data.token, data.username, data.role || 'user', options.autoLogin !== false);
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
          this.role = data.role || 'user';
          // storage에도 role 업데이트
          this._updateRole(data.role || 'user');
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
  _setSession(token, username, role, autoLogin) {
    this.token = token;
    this.username = username;
    this.role = role || 'user';

    // 양쪽 다 정리
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    localStorage.removeItem('auth_role');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_username');
    sessionStorage.removeItem('auth_role');

    // 자동로그인이면 localStorage (영구), 아니면 sessionStorage (탭 닫으면 삭제)
    const storage = autoLogin ? localStorage : sessionStorage;
    storage.setItem('auth_token', token);
    storage.setItem('auth_username', username);
    storage.setItem('auth_role', this.role);

    localStorage.removeItem('cloud_auth_key');
  },

  /** role만 업데이트 (checkSession 후) */
  _updateRole(role) {
    this.role = role;
    if (localStorage.getItem('auth_token')) {
      localStorage.setItem('auth_role', role);
    } else if (sessionStorage.getItem('auth_token')) {
      sessionStorage.setItem('auth_role', role);
    }
  },

  /** 세션 삭제 (내부) */
  _clearSession() {
    this.token = null;
    this.username = null;
    this.role = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    localStorage.removeItem('auth_role');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_username');
    sessionStorage.removeItem('auth_role');
    localStorage.removeItem('cloud_auth_key');
  },

  // =====================================================
  //  비밀번호 저장 (폼 자동 채움용)
  // =====================================================

  /** 아이디/비밀번호를 localStorage에 저장 (base64 인코딩) */
  saveCredentials(username, password) {
    try {
      const json = JSON.stringify({ u: username, p: password });
      const encoded = btoa(unescape(encodeURIComponent(json)));
      localStorage.setItem('saved_credentials', encoded);
    } catch (e) { /* ignore */ }
  },

  /** 저장된 아이디/비밀번호 불러오기 */
  getSavedCredentials() {
    try {
      const raw = localStorage.getItem('saved_credentials');
      if (!raw) return null;
      const decoded = decodeURIComponent(escape(atob(raw)));
      return JSON.parse(decoded);
    } catch (e) {
      return null;
    }
  },

  /** 저장된 아이디/비밀번호 삭제 */
  clearSavedCredentials() {
    localStorage.removeItem('saved_credentials');
  },

  // =====================================================
  //  체크박스 상태 저장/복원
  // =====================================================

  /** 체크박스 상태 저장 */
  saveCheckboxStates(savePw, autoLogin) {
    localStorage.setItem('auth_pref_save_pw', savePw ? '1' : '0');
    localStorage.setItem('auth_pref_auto_login', autoLogin ? '1' : '0');
  },

  /** 체크박스 상태 불러오기 */
  getCheckboxStates() {
    return {
      savePw: localStorage.getItem('auth_pref_save_pw') === '1',
      autoLogin: localStorage.getItem('auth_pref_auto_login') !== '0' // 기본값 true
    };
  }
};
