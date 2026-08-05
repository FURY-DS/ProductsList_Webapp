/* =====================================================
   auth.js - 사용자 인증 모듈
   회원가입 / 로그인 / 로그아웃 / 세션 확인

   자동로그인 ON  → 토큰을 localStorage에 저장 (브라우저 재시작 후에도 유지, 30일)
   자동로그인 OFF → 토큰을 sessionStorage에 저장 (탭 닫으면 삭제)
   비밀번호 저장  → 아이디/비밀번호를 localStorage에 저장 (폼 자동 채움)
   ===================================================== */

/**
 * 인증이 필요 없는/있는 API 요청 공통 처리.
 * - 기본 Content-Type: application/json
 * - 인증 필요 시 {auth: true} 옵션 → Auth.getAuthHeader() 자동 부착
 * - 401 → 세션 만료 처리 (storage 클리어) 후 { ok: false, msg: '세션이 만료되었습니다', unauthorized: true } 반환
 * - 그 외 !res.ok → { ok: false, msg: data.error || defaultMsg } 반환
 * - 네트워크 오류 (fetch 자체 throw) → { ok: false, msg: '네트워크 오류: ...', networkError: true } 반환
 * - 성공 → { ok: true, data } 반환
 *
 * @param {string} url - 요청 URL (예: '/api/auth/login')
 * @param {Object} [options={}] - fetch 옵션 + { auth?: boolean, defaultMsg?: string }
 * @returns {Promise<{ok: boolean, msg?: string, unauthorized?: boolean, networkError?: boolean, data?: any}>}
 */
async function apiFetch(url, options = {}) {
  const { auth = false, defaultMsg = '요청 실패', ...fetchOptions } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {}),
    ...(auth ? Auth.getAuthHeader() : {})
  };

  try {
    const res = await fetch(url, { ...fetchOptions, headers });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      Auth._clearSession();
      return { ok: false, msg: '세션이 만료되었습니다', unauthorized: true };
    }
    if (!res.ok) {
      return { ok: false, msg: data.error || defaultMsg };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, msg: '네트워크 오류: ' + e.message, networkError: true };
  }
}

const Auth = {
  token: null,
  username: null,
  role: null,

  /**
   * 초기화 - localStorage 또는 sessionStorage에서 토큰/사용자명/역할 복원.
   * init()은 페이지 로드 시 가장 먼저 호출되어야 함.
   */
  init() {
    this.token = Auth._readStored('auth_token');
    this.username = Auth._readStored('auth_username');
    this.role = Auth._readStored('auth_role');
  },

  /**
   * localStorage 우선, 없으면 sessionStorage에서 값 읽기.
   * 자동로그인 여부에 따라 토큰 저장 위치가 다르기 때문.
   * @param {string} key
   * @returns {string|null}
   */
  _readStored(key) {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || null;
  },

  /** 인증 여부 (토큰 존재) */
  isAuthenticated() {
    return !!this.token;
  },

  /** 관리자 여부 */
  isAdmin() {
    return this.role === 'admin';
  },

  /**
   * 회원가입
   * @param {string} username
   * @param {string} password
   * @param {string} name
   * @param {string} email
   * @param {Object} [options]
   * @param {boolean} [options.autoLogin=true] - true면 localStorage(영구), false면 sessionStorage
   * @returns {Promise<{ok: boolean, msg?: string}>}
   */
  async register(username, password, name, email, options = {}) {
    const result = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, name, email }),
      defaultMsg: '회원가입 실패'
    });
    if (!result.ok) return result;
    this._setSession(result.data.token, result.data.username, result.data.role || 'user', options.autoLogin !== false);
    return { ok: true };
  },

  // =====================================================
  //  아이디 찾기 (이메일 인증번호)
  // =====================================================

  /**
   * 1단계: 인증번호 발송 요청
   * @returns {Promise<{ok: boolean, msg?: string, devCode?: string|null}>}
   *   devCode는 개발 환경에서만 채워짐 (이메일 미설정 시)
   */
  async findIdRequest(name, email) {
    const result = await apiFetch('/api/auth/find-id', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
      defaultMsg: '인증번호 발송 실패'
    });
    if (!result.ok) return result;
    return { ok: true, devCode: result.data.devCode || null };
  },

  /**
   * 2단계: 인증번호 검증 → username 반환
   * @returns {Promise<{ok: boolean, msg?: string, username?: string, maskedEmail?: string}>}
   */
  async findIdVerify(name, email, code) {
    const result = await apiFetch('/api/auth/find-id/verify', {
      method: 'POST',
      body: JSON.stringify({ name, email, code }),
      defaultMsg: '인증 실패'
    });
    if (!result.ok) return result;
    return { ok: true, username: result.data.username, maskedEmail: result.data.maskedEmail };
  },

  // =====================================================
  //  비밀번호 찾기 (이메일 인증번호 → 새 비밀번호)
  // =====================================================

  /**
   * 1단계: 인증번호 발송 요청
   * @returns {Promise<{ok: boolean, msg?: string, devCode?: string|null}>}
   */
  async findPasswordRequest(name, username, email) {
    const result = await apiFetch('/api/auth/find-pw', {
      method: 'POST',
      body: JSON.stringify({ name, username, email }),
      defaultMsg: '인증번호 발송 실패'
    });
    if (!result.ok) return result;
    return { ok: true, devCode: result.data.devCode || null };
  },

  /**
   * 2단계: 인증번호 + 새 비밀번호 → 재설정
   * @returns {Promise<{ok: boolean, msg?: string, invalidatedSessions?: number}>}
   */
  async findPasswordVerify(name, username, email, code, newPassword) {
    const result = await apiFetch('/api/auth/find-pw/verify', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, code, newPassword }),
      defaultMsg: '비밀번호 재설정 실패'
    });
    if (!result.ok) return result;
    return { ok: true, invalidatedSessions: result.data.invalidatedSessions || 0 };
  },

  // =====================================================
  //  비밀번호 변경 (로그인 상태)
  // =====================================================

  /**
   * 현재 세션으로 비밀번호 변경 (현재 비번 검증 필요)
   * @returns {Promise<{ok: boolean, msg?: string}>}
   */
  async changePassword(oldPassword, newPassword) {
    if (!this.token) {
      return { ok: false, msg: '로그인이 필요합니다' };
    }
    return apiFetch('/api/auth/change-password', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ oldPassword, newPassword }),
      defaultMsg: '비밀번호 변경 실패'
    });
  },

  /**
   * 로그인
   * @param {string} username
   * @param {string} password
   * @param {Object} [options]
   * @param {boolean} [options.autoLogin=true] - true면 localStorage(영구), false면 sessionStorage
   * @returns {Promise<{ok: boolean, msg?: string}>}
   */
  async login(username, password, options = {}) {
    const result = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      defaultMsg: '로그인 실패'
    });
    if (!result.ok) return result;
    this._setSession(result.data.token, result.data.username, result.data.role || 'user', options.autoLogin !== false);
    return { ok: true };
  },

  /**
   * 로그아웃 - 서버에 알린 뒤 로컬 세션 정리. 서버 요청 실패해도 로컬은 정리됨.
   */
  async logout() {
    if (this.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: Auth.getAuthHeader()
        });
      } catch (e) { /* ignore */ }
    }
    this._clearSession();
  },

  /**
   * 세션 유효성 확인 (서버에 검증).
   * - 2xx + username 존재: 세션 유효 → true (역할도 동기화)
   * - 401: 만료 → false (apiFetch가 이미 _clearSession 호출)
   * - 그 외 비-2xx (5xx 등): 세션 클리어 + false (서버가 명시적으로 거부한 것으로 간주)
   * - 네트워크 오류: 토큰 유지 + true (오프라인에서 localStorage 데이터 사용 가능하도록)
   * @returns {Promise<boolean>}
   */
  async checkSession() {
    if (!this.token) return false;
    const result = await apiFetch('/api/auth/me', { auth: true });
    if (result.ok && result.data.username) {
      this.username = result.data.username;
      this.role = result.data.role || 'user';
      this._updateRole(this.role);
      return true;
    }
    if (result.unauthorized) return false;
    if (result.networkError) return true; // 오프라인 → 토큰 유지
    // 그 외 (5xx 등 서버 명시적 거부): 세션 클리어
    this._clearSession();
    return false;
  },

  /**
   * Authorization 헤더 객체 반환 (Bearer 토큰이 있으면).
   * fetch 헤더에 spread로 합치기: `{ ...Auth.getAuthHeader() }`
   * @returns {{Authorization: string}|{}}
   */
  getAuthHeader() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  },

  /**
   * 세션 저장 (내부). 양쪽 storage 모두 정리한 뒤 autoLogin 여부에 따라 한쪽에만 저장.
   * @param {string} token
   * @param {string} username
   * @param {string} role
   * @param {boolean} autoLogin - true면 localStorage(영구), false면 sessionStorage
   */
  _setSession(token, username, role, autoLogin) {
    this.token = token;
    this.username = username;
    this.role = role || 'user';

    this._clearAllSessionStorage();

    const storage = autoLogin ? localStorage : sessionStorage;
    storage.setItem('auth_token', token);
    storage.setItem('auth_username', username);
    storage.setItem('auth_role', this.role);

    localStorage.removeItem('cloud_auth_key');
  },

  /**
   * role만 업데이트 (checkSession 후 권한 변경 반영).
   * 저장 위치는 현재 토큰이 있는 쪽에 맞춤.
   */
  _updateRole(role) {
    this.role = role;
    if (localStorage.getItem('auth_token')) {
      localStorage.setItem('auth_role', role);
    } else if (sessionStorage.getItem('auth_token')) {
      sessionStorage.setItem('auth_role', role);
    }
  },

  /**
   * 세션 삭제 (내부). 양쪽 storage 모두에서 제거.
   */
  _clearSession() {
    this.token = null;
    this.username = null;
    this.role = null;
    this._clearAllSessionStorage();
    localStorage.removeItem('cloud_auth_key');
  },

  /**
   * 인증 관련 키를 localStorage/sessionStorage 모두에서 제거.
   * _setSession과 _clearSession에서 공통으로 사용.
   */
  _clearAllSessionStorage() {
    const keys = ['auth_token', 'auth_username', 'auth_role'];
    keys.forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  },

  // =====================================================
  //  비밀번호 저장 (폼 자동 채움용)
  // =====================================================

  /**
   * 아이디/비밀번호를 localStorage에 저장 (base64 인코딩).
   * 보안용이 아닌 단순 폼 자동 채움용. base64는 인코딩일 뿐 암호화 아님.
   */
  saveCredentials(username, password) {
    try {
      const json = JSON.stringify({ u: username, p: password });
      const encoded = btoa(unescape(encodeURIComponent(json)));
      localStorage.setItem('saved_credentials', encoded);
    } catch (e) { /* ignore */ }
  },

  /** 저장된 아이디/비밀번호 불러오기 (없거나 파싱 실패 시 null) */
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

  /**
   * 로그인 폼의 체크박스 상태 저장 (자동로그인 기본값은 true).
   * @param {boolean} savePw
   * @param {boolean} autoLogin
   */
  saveCheckboxStates(savePw, autoLogin) {
    localStorage.setItem('auth_pref_save_pw', savePw ? '1' : '0');
    localStorage.setItem('auth_pref_auto_login', autoLogin ? '1' : '0');
  },

  /** 체크박스 상태 불러오기 (자동로그인 기본값 true). */
  getCheckboxStates() {
    return {
      savePw: localStorage.getItem('auth_pref_save_pw') === '1',
      autoLogin: localStorage.getItem('auth_pref_auto_login') !== '0'
    };
  }
};
