/* =====================================================
   app.js - 앱 초기화, 인증 흐름, 키보드 단축키
   ===================================================== */

/** DOM 로드 후 시작: 인증 확인 → 앱 시작 or 로그인 화면 */
async function init() {
  Auth.init();

  // 인증 UI 이벤트 바인딩
  initAuthUI();

  // 세션 확인
  const isValid = await Auth.checkSession();

  if (isValid) {
    await startApp();
  } else {
    showAuthOverlay();
  }

  bindKeyboardShortcuts();
}

/** 인증된 사용자를 위한 앱 초기화 */
async function startApp() {
  hideAuthOverlay();

  // 메뉴를 최우선으로 초기화 (다른 init 실패해도 메뉴는 작동해야 함)
  try { initMenu(); } catch (e) { console.error('initMenu error:', e); }

  // 나머지 모듈 초기화 (각각 독립적으로 try-catch)
  try { initToast(); } catch (e) { console.error('initToast error:', e); }
  try { initModal(); } catch (e) { console.error('initModal error:', e); }
  try { initBoard(); } catch (e) { console.error('initBoard error:', e); }
  try { initSearch(); } catch (e) { console.error('initSearch error:', e); }
  try { initActions(); } catch (e) { console.error('initActions error:', e); }
  try { initRateBulk(); } catch (e) { console.error('initRateBulk error:', e); }
  try { initPercentBulk(); } catch (e) { console.error('initPercentBulk error:', e); }

  // 사용자 정보 표시
  updateUserInfo();

  // 클라우드 동기화
  CloudSync.init();
  CloudSync.startAutoSync(10000);

  // 탭이 다시 활성화될 때 즉시 pull
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && CloudSync.enabled) {
      cloudPullAndRender();
    }
  });

  // 데이터 로드
  load();

  // 첫 실행 시 카드 1개 생성
  if (state.cards.length === 0) {
    state.cards.push(newCard());
  }

  // 첫 렌더링
  render();

  // 클라우드에서 최신 데이터 확인 (백그라운드)
  cloudPullAndRender();
}

// =====================================================
//  인증 UI
// =====================================================

/** 인증 오버레이 표시 */
function showAuthOverlay() {
  document.body.classList.add('app-hidden');
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.style.display = 'flex';

  // 폼 초기화
  const errEl = document.getElementById('auth-error');
  if (errEl) errEl.textContent = '';
  const submitBtn = document.getElementById('auth-submit');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = '로그인';
  }

  // 체크박스 상태 복원
  const prefs = Auth.getCheckboxStates();
  const savePwCb = document.getElementById('auth-save-pw');
  const autoLoginCb = document.getElementById('auth-auto-login');
  if (savePwCb) savePwCb.checked = prefs.savePw;
  if (autoLoginCb) autoLoginCb.checked = prefs.autoLogin;

  // 비밀번호 저장이 켜져 있으면 아이디/비밀번호 자동 채움
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  if (prefs.savePw) {
    const saved = Auth.getSavedCredentials();
    if (saved) {
      if (usernameInput) usernameInput.value = saved.u || '';
      if (passwordInput) passwordInput.value = saved.p || '';
    }
  } else {
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
  }
  const passwordConfirmInput = document.getElementById('auth-password-confirm');
  if (passwordConfirmInput) passwordConfirmInput.value = '';

  // auth-options 표시 (로그인 탭일 때만)
  const activeTab = document.querySelector('.auth-tab.active');
  const mode = activeTab ? activeTab.dataset.mode : 'login';
  const optionsEl = document.getElementById('auth-options');
  if (optionsEl) {
    if (mode === 'login') optionsEl.classList.remove('hidden');
    else optionsEl.classList.add('hidden');
  }
}

/** 인증 오버레이 숨기기 + 앱 표시 */
function hideAuthOverlay() {
  document.body.classList.remove('app-hidden');
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.style.display = 'none';
}

/** 인증 UI 이벤트 바인딩 */
function initAuthUI() {
  // 탭 전환 (로그인 ↔ 회원가입)
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const mode = tab.dataset.mode;
      const submitBtn = document.getElementById('auth-submit');
      const confirmField = document.getElementById('auth-confirm-field');

      if (mode === 'register') {
        if (submitBtn) submitBtn.textContent = '회원가입';
        if (confirmField) confirmField.classList.remove('hidden');
      } else {
        if (submitBtn) submitBtn.textContent = '로그인';
        if (confirmField) confirmField.classList.add('hidden');
      }

      // 체크박스 옵션은 로그인 탭에서만 표시
      const optionsEl = document.getElementById('auth-options');
      if (optionsEl) {
        if (mode === 'login') optionsEl.classList.remove('hidden');
        else optionsEl.classList.add('hidden');
      }

      // 에러 메시지 초기화
      const errEl = document.getElementById('auth-error');
      if (errEl) errEl.textContent = '';
    });
  });

  // 폼 제출
  const form = document.getElementById('auth-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleAuthSubmit();
    });
  }

  // 로그아웃 버튼
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // 수동 동기화 버튼
  const syncBtn = document.getElementById('btn-cloud-sync');
  if (syncBtn) {
    syncBtn.addEventListener('click', manualCloudSync);
  }
}

/** 로그인 / 회원가입 처리 */
async function handleAuthSubmit() {
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  const passwordConfirmInput = document.getElementById('auth-password-confirm');
  const errEl = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit');

  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const activeTab = document.querySelector('.auth-tab.active');
  const mode = activeTab ? activeTab.dataset.mode : 'login';

  // 에러 초기화
  if (errEl) errEl.textContent = '';

  // 입력값 검증
  if (!username || !password) {
    if (errEl) errEl.textContent = '아이디와 비밀번호를 입력해주세요';
    return;
  }

  if (mode === 'register') {
    const confirm = passwordConfirmInput ? passwordConfirmInput.value : '';
    if (password !== confirm) {
      if (errEl) errEl.textContent = '비밀번호가 일치하지 않습니다';
      return;
    }
  }

  // 버튼 비활성화
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';
  }

  try {
    // 체크박스 상태 읽기
    const savePwCb = document.getElementById('auth-save-pw');
    const autoLoginCb = document.getElementById('auth-auto-login');
    const savePw = savePwCb ? savePwCb.checked : false;
    const autoLogin = autoLoginCb ? autoLoginCb.checked : true;

    // 체크박스 상태 저장 (다음에 폼 열 때 복원용)
    Auth.saveCheckboxStates(savePw, autoLogin);

    let result;
    if (mode === 'register') {
      result = await Auth.register(username, password, { autoLogin });
      // 회원가입 시에도 비밀번호 저장 (로그인과 동일하게)
      if (result.ok && savePw) {
        Auth.saveCredentials(username, password);
      } else if (result.ok && !savePw) {
        Auth.clearSavedCredentials();
      }
    } else {
      result = await Auth.login(username, password, { autoLogin });
      if (result.ok && savePw) {
        Auth.saveCredentials(username, password);
      } else if (result.ok && !savePw) {
        Auth.clearSavedCredentials();
      }
    }

    if (result.ok) {
      await startApp();
    } else {
      if (errEl) errEl.textContent = result.msg;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = mode === 'register' ? '회원가입' : '로그인';
      }
    }
  } catch (e) {
    if (errEl) errEl.textContent = '오류가 발생했습니다: ' + e.message;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'register' ? '회원가입' : '로그인';
    }
  }
}

/** 로그아웃 처리 */
async function handleLogout() {
  CloudSync.stopAutoSync();
  await Auth.logout();

  // state 초기화 (이전 사용자 데이터가 남지 않도록)
  if (typeof state !== 'undefined' && state.cards) {
    state.cards = [];
  }

  showAuthOverlay();

  // 폼 초기화는 showAuthOverlay에서 처리하므로 여기서는 체크박스만 정리
  const passwordConfirmInput = document.getElementById('auth-password-confirm');
  if (passwordConfirmInput) passwordConfirmInput.value = '';

  // 로그인 탭으로 초기화
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  const loginTab = document.querySelector('.auth-tab[data-mode="login"]');
  if (loginTab) loginTab.classList.add('active');
  const submitBtn = document.getElementById('auth-submit');
  if (submitBtn) submitBtn.textContent = '로그인';
  const confirmField = document.getElementById('auth-confirm-field');
  if (confirmField) confirmField.classList.add('hidden');
  const optionsEl = document.getElementById('auth-options');
  if (optionsEl) optionsEl.classList.remove('hidden');
}

/** 헤더에 사용자 정보 + 동기화 상태 표시 */
function updateUserInfo() {
  const badge = document.getElementById('user-badge');
  if (badge && Auth.username) {
    const roleLabel = Auth.isAdmin() ? ' 👑관리자' : '';
    badge.textContent = Auth.username + roleLabel;
  }

  // 관리자 패널 링크 표시/숨김
  const adminLink = document.getElementById('admin-link');
  if (adminLink) {
    adminLink.style.display = Auth.isAdmin() ? 'inline-block' : 'none';
  }

  const syncBtn = document.getElementById('btn-cloud-sync');
  if (syncBtn) {
    syncBtn.classList.add('active');
    syncBtn.title = CloudSync.getStatusText();
  }
}

// =====================================================
//  클라우드 동기화
// =====================================================

/** 클라우드에서 최신 데이터를 가져와서 교체 + 재렌더링 */
async function cloudPullAndRender() {
  if (!CloudSync.enabled) return;

  const cloudData = await CloudSync.pull();
  if (!cloudData || !cloudData.data || !Array.isArray(cloudData.data)) return;

  // 클라우드가 더 최신이면 교체
  if (cloudData.ts > CloudSync.lastSyncTs) {
    console.log('[CloudSync] 클라우드에서 최신 데이터 로드');
    CloudSync.lastSyncTs = cloudData.ts;
    localStorage.setItem('cloud_last_sync', cloudData.ts.toString());

    // 데이터 마이그레이션 (기존 load() 로직과 동일)
    state.cards = cloudData.data.filter(c => c && typeof c === 'object').map(c => {
      const defaults = newCard();
      return {
        ...defaults,
        ...c,
        id: c.id || defaults.id,
        isEditing: typeof c.isEditing === 'boolean' ? c.isEditing : false,
        isCollapsed: typeof c.isCollapsed === 'boolean' ? c.isCollapsed : false,
        image: c.image || ''
      };
    });

    // localStorage에도 저장
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(state.cards));
    } catch (e) { /* ignore */ }

    render();
    if (typeof showToast === 'function') {
      showToast('☁️ 클라우드에서 최신 데이터를 불러왔어요');
    }
  }
}

/** 수동 클라우드 동기화 (버튼) */
async function manualCloudSync() {
  if (!CloudSync.enabled) {
    showToast('로그인이 필요합니다');
    return;
  }

  showToast('☁️ 동기화 중...');

  // 1. 클라우드에서 최신 확인
  await cloudPullAndRender();

  // 2. 현재 데이터를 클라우드에 push
  const ok = await CloudSync.push(state.cards);

  if (ok) {
    showToast('☁️ 동기화 완료!');
    updateUserInfo();
  } else {
    showToast('❌ 동기화 실패');
  }
}

// =====================================================
//  키보드 단축키
// =====================================================

function bindKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // ESC: 드롭다운 / 모달 닫기
    if (e.key === 'Escape') {
      if (isMenuOpen()) {
        toggleMenu(false);
        return;
      }
      if (isModalOpen()) {
        closeModal();
        return;
      }
    }

    // Ctrl/Cmd + S: 수동 저장
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      reportSaveResult(save(), CONFIG.MESSAGES, CONFIG.MESSAGES.SAVED);
    }

    // Ctrl/Cmd + F: 검색창 포커스
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.focus();
    }
  });
}

// DOM 준비되면 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
