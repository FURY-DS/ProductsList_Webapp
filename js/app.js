/* =====================================================
   app.js - 앱 초기화, 인증 흐름, 키보드 단축키
   ===================================================== */

/**
 * DOM 로드 후 시작. 인증 확인 → 앱 시작 or 로그인 화면.
 * @returns {Promise<void>}
 */
async function init() {
  Auth.init();

  // 인증 UI 이벤트 바인딩
  initAuthUI();

  // 아이디찾기/비밀번호찾기/비밀번호변경 모달 초기화 (오버레이 단계에서 필요)
  try { AccountRecovery.init(); } catch (e) { console.error('AccountRecovery.init error:', e); }
  try { bindUserBadgeClick(); } catch (e) { console.error('bindUserBadgeClick error:', e); }

  // 세션 확인
  const isValid = await Auth.checkSession();

  if (isValid) {
    await startApp();
  } else {
    showAuthOverlay();
  }

  bindKeyboardShortcuts();
}

/**
 * 인증된 사용자를 위한 앱 초기화.
 * 각 모듈 init은 독립적 try-catch로 감싸져 있어, 하나가 실패해도 나머지는 작동.
 * @returns {Promise<void>}
 */
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
  // AccountRecovery.init() & bindUserBadgeClick()은 init()에서 이미 호출됨 (로그인 전 오버레이에서도 작동해야 함)

  // 사용자 정보 표시
  updateUserInfo();

  // 클라우드 동기화
  CloudSync.init(CONFIG.STORAGE_KEY);
  CloudSync.startAutoSync(10000);

  // 탭이 다시 활성화될 때 즉시 pull
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && CloudSync.enabled) {
      cloudPullAndRender();
    }
  });

  // 데이터 로드 — 클라우드를 먼저 확인해서 stale localStorage를 정리한 뒤 localStorage를 읽음
  // (계정 삭제 후 재가입 시 옛 데이터가 잠깐이라도 보이지 않도록)
  if (CloudSync.enabled) {
    await cloudPullAndRender();
  }
  load();

  // 첫 렌더링 (데이터가 0개면 빈 상태 그대로 표시)
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
  const nameInput = document.getElementById('auth-name');
  if (nameInput) nameInput.value = '';
  const emailInput = document.getElementById('auth-email');
  if (emailInput) emailInput.value = '';

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
  // 약관 본문 주입
  injectTermsContent();

  // 탭 전환 (로그인 ↔ 회원가입)
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const mode = tab.dataset.mode;
      setAuthMode(mode);
    });
  });

  // 약관 체크박스 바인딩
  bindTermsCheckboxes();

  // step 이동 버튼
  const cancelStep1Btn = document.getElementById('auth-cancel-step1');
  if (cancelStep1Btn) cancelStep1Btn.addEventListener('click', () => switchToLoginTab());

  const nextStepBtn = document.getElementById('auth-next-step');
  if (nextStepBtn) nextStepBtn.addEventListener('click', () => goToRegisterStep(2));

  const prevStepBtn = document.getElementById('auth-prev-step');
  if (prevStepBtn) prevStepBtn.addEventListener('click', () => goToRegisterStep(1));

  const doneBtn = document.getElementById('auth-done');
  if (doneBtn) {
    doneBtn.addEventListener('click', async () => {
      try {
        await startApp();
      } catch (e) {
        // startApp 실패 시 로그인 탭으로 폴백
        console.error('startApp error after register:', e);
        resetRegisterUI();
        switchToLoginTab();
      }
    });
  }

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

/** 약관 본문 주입 */
function injectTermsContent() {
  if (typeof TERMS === 'undefined') return;
  const serviceBox = document.getElementById('terms-box-service');
  const privacyBox = document.getElementById('terms-box-privacy');
  const marketingBox = document.getElementById('terms-box-marketing');
  if (serviceBox) serviceBox.innerHTML = TERMS.service;
  if (privacyBox) privacyBox.innerHTML = TERMS.privacy;
  if (marketingBox) marketingBox.innerHTML = TERMS.marketing;
}

/** 약관 체크박스 바인딩 (전체 동의 ↔ 개별 동기화) */
function bindTermsCheckboxes() {
  const allCb = document.getElementById('terms-agree-all');
  const individualCbs = document.querySelectorAll('.terms-cb');
  const nextBtn = document.getElementById('auth-next-step');

  const refreshNextState = () => {
    if (!nextBtn) return;
    const requiredCbs = Array.from(individualCbs).filter(cb => cb.dataset.required === '1');
    const allRequiredChecked = requiredCbs.every(cb => cb.checked);
    nextBtn.disabled = !allRequiredChecked;
  };

  if (allCb) {
    allCb.addEventListener('change', () => {
      individualCbs.forEach(cb => { cb.checked = allCb.checked; });
      refreshNextState();
    });
  }

  individualCbs.forEach(cb => {
    cb.addEventListener('change', () => {
      // 전체 동의 자동 토글
      if (allCb) {
        const totalCount = individualCbs.length;
        const checkedCount = Array.from(individualCbs).filter(c => c.checked).length;
        allCb.checked = (totalCount === checkedCount);
      }
      refreshNextState();
    });
  });

  refreshNextState();
}

/** 인증 모드 전환 (login / register) */
function setAuthMode(mode) {
  const card = document.getElementById('auth-card');
  const stepper = document.getElementById('auth-stepper');
  const linksEl = document.getElementById('auth-links');
  const optionsEl = document.getElementById('auth-options');
  const errEl = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit');
  const allCb = document.getElementById('terms-agree-all');
  const loginStep = document.getElementById('auth-login-step');

  if (errEl) errEl.textContent = '';

  if (mode === 'register') {
    if (card) card.classList.add('is-register');
    if (stepper) stepper.classList.remove('hidden');
    if (linksEl) linksEl.style.display = 'none';
    if (optionsEl) optionsEl.style.display = 'none';
    if (submitBtn) submitBtn.textContent = '회원가입';
    if (loginStep) loginStep.classList.add('hidden');

    // 회원가입은 항상 step1부터
    goToRegisterStep(1, /* resetAll */ true);
  } else {
    if (card) card.classList.remove('is-register');
    if (stepper) stepper.classList.add('hidden');
    if (linksEl) linksEl.style.display = '';
    if (optionsEl) optionsEl.style.display = '';
    if (submitBtn) submitBtn.textContent = '로그인';
    if (loginStep) loginStep.classList.remove('hidden');

    // 모든 회원가입 step 숨김
    document.querySelectorAll('.auth-step').forEach(s => s.classList.add('hidden'));
    // 로그인 폼만 다시 보임
    if (loginStep) loginStep.classList.remove('hidden');
  }
}

/** 회원가입 step 전환 (1 / 2 / 3) */
function goToRegisterStep(stepNum, resetAll = false) {
  // step 영역 토글
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('auth-step-' + i);
    if (el) el.classList.toggle('hidden', i !== stepNum);
  }
  // stepper 활성 표시
  document.querySelectorAll('.stepper-item').forEach(item => {
    const n = parseInt(item.dataset.step, 10);
    item.classList.remove('active', 'done');
    if (n === stepNum) item.classList.add('active');
    else if (n < stepNum) item.classList.add('done');
  });

  // 에러 초기화
  const errEl = document.getElementById('auth-error');
  if (errEl) errEl.textContent = '';

  // step1로 갈 때 약관 체크박스 초기화
  if (stepNum === 1 && resetAll) {
    const allCb = document.getElementById('terms-agree-all');
    if (allCb) allCb.checked = false;
    document.querySelectorAll('.terms-cb').forEach(cb => { cb.checked = false; });
    const nextBtn = document.getElementById('auth-next-step');
    if (nextBtn) nextBtn.disabled = true;
  }

  // step3로 갈 때 완료 메시지
  if (stepNum === 3) {
    const username = document.getElementById('reg-username');
    const metaEl = document.getElementById('register-done-username');
    if (metaEl) {
      metaEl.textContent = username && username.value
        ? `'${username.value}' 으로 가입되었습니다.`
        : '로그인 화면으로 이동합니다.';
    }
    // step3에서는 탭 전환 잠금
    document.querySelectorAll('.auth-tab').forEach(t => {
      t.style.pointerEvents = 'none';
      t.style.opacity = '0.4';
    });
  } else {
    // step1/2에서는 탭 전환 가능
    document.querySelectorAll('.auth-tab').forEach(t => {
      t.style.pointerEvents = '';
      t.style.opacity = '';
    });
  }

  // step2로 갈 때 첫 입력에 포커스
  if (stepNum === 2) {
    const firstField = document.getElementById('reg-name');
    if (firstField) setTimeout(() => firstField.focus(), 50);
  }
}

/** 회원가입 탭으로 전환하되 입력값 초기화 */
function switchToLoginTab() {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  const loginTab = document.querySelector('.auth-tab[data-mode="login"]');
  if (loginTab) loginTab.classList.add('active');
  setAuthMode('login');
}

/** 회원가입 UI 전체 초기화 (가입 완료 후 등) */
function resetRegisterUI() {
  const allCb = document.getElementById('terms-agree-all');
  if (allCb) allCb.checked = false;
  document.querySelectorAll('.terms-cb').forEach(cb => { cb.checked = false; });
  const regName = document.getElementById('reg-name');
  if (regName) regName.value = '';
  const regUsername = document.getElementById('reg-username');
  if (regUsername) regUsername.value = '';
  const regPw = document.getElementById('reg-password');
  if (regPw) regPw.value = '';
  const regConfirm = document.getElementById('reg-password-confirm');
  if (regConfirm) regConfirm.value = '';
  const regEmail = document.getElementById('reg-email');
  if (regEmail) regEmail.value = '';
  const regError = document.getElementById('reg-error');
  if (regError) regError.textContent = '';
  const nextBtn = document.getElementById('auth-next-step');
  if (nextBtn) nextBtn.disabled = true;
  // 폼 안 보이게
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('auth-step-' + i);
    if (el) el.classList.add('hidden');
  }
}

/** 로그인 / 회원가입 처리 */
async function handleAuthSubmit() {
  const activeTab = document.querySelector('.auth-tab.active');
  const mode = activeTab ? activeTab.dataset.mode : 'login';

  // mode에 따라 적절한 input 선택
  let usernameInput, passwordInput, passwordConfirmInput, nameInput, emailInput;
  let errEl, submitBtn;

  if (mode === 'register') {
    // 회원가입(step2) input들
    usernameInput = document.getElementById('reg-username');
    passwordInput = document.getElementById('reg-password');
    passwordConfirmInput = document.getElementById('reg-password-confirm');
    nameInput = document.getElementById('reg-name');
    emailInput = document.getElementById('reg-email');
    errEl = document.getElementById('reg-error');
    submitBtn = document.getElementById('reg-submit');
  } else {
    // 로그인 input들
    usernameInput = document.getElementById('auth-username');
    passwordInput = document.getElementById('auth-password');
    passwordConfirmInput = null;
    nameInput = null;
    emailInput = null;
    errEl = document.getElementById('auth-error');
    submitBtn = document.getElementById('auth-submit');
  }

  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

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
    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    if (!name) {
      if (errEl) errEl.textContent = '이름을 입력해주세요';
      return;
    }
    if (!email) {
      if (errEl) errEl.textContent = '이메일을 입력해주세요';
      return;
    }
  }

  // 버튼 비활성화
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';
  }

  try {
    // 체크박스 상태 읽기 (로그인 시에만 의미 있음, 회원가입은 step2에 체크박스 없음)
    const savePwCb = document.getElementById('auth-save-pw');
    const autoLoginCb = document.getElementById('auth-auto-login');
    const savePw = savePwCb ? savePwCb.checked : false;
    const autoLogin = autoLoginCb ? autoLoginCb.checked : true;

    // 체크박스 상태 저장 (다음에 폼 열 때 복원용)
    Auth.saveCheckboxStates(savePw, autoLogin);

    let result;
    if (mode === 'register') {
      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      result = await Auth.register(username, password, name, email, { autoLogin });
      // 회원가입 시에는 비밀번호 저장 옵션을 step2에서 받지 않으므로 저장하지 않음
    } else {
      result = await Auth.login(username, password, { autoLogin });
      if (result.ok && savePw) {
        Auth.saveCredentials(username, password);
      } else if (result.ok && !savePw) {
        Auth.clearSavedCredentials();
      }
    }

    if (result.ok) {
      // 회원가입 성공 → step3(가입완료)로 이동
      if (mode === 'register') {
        goToRegisterStep(3);
      } else {
        await startApp();
      }
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

  // 로그인 탭으로 초기화 (setAuthMode가 step 영역까지 정리)
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  const loginTab = document.querySelector('.auth-tab[data-mode="login"]');
  if (loginTab) loginTab.classList.add('active');
  setAuthMode('login');

  // 비밀번호 저장 체크박스만 별도로 복원
  const passwordInput = document.getElementById('auth-password');
  if (passwordInput) passwordInput.value = '';
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
  if (!cloudData) return; // 네트워크 오류 또는 인증 실패 → 아무것도 하지 않음

  // 클라우드 데이터가 비어있으면 (계정 삭제 후 재가입 등) localStorage도 정리
  if (!cloudData.data || !Array.isArray(cloudData.data)) {
    const storageKey = getStorageKey();
    const hadLocal = !!localStorage.getItem(storageKey);
    if (hadLocal) {
      console.log('[CloudSync] 서버에 데이터 없음 → localStorage 정리 (계정 삭제됨)');
      state.cards = [];
      try {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(storageKey + '_backup');
      } catch (e) { /* ignore */ }
      CloudSync.lastSyncTs = 0;
      try { localStorage.setItem(getSyncKey(), '0'); } catch (e) { /* ignore */ }
      render();
      if (typeof showToast === 'function') {
        // 세션당 한 번만 토스트 (자동 동기화/탭전환마다 뜨는 것 방지)
        const toastFlag = 'clearStaleToastShown_' + (Auth.username || '');
        if (!sessionStorage.getItem(toastFlag)) {
          sessionStorage.setItem(toastFlag, '1');
          showToast('☁️ 서버에 데이터가 없어 초기화했어요');
        } else {
          console.log('[CloudSync] 정리 완료 (토스트는 이번 세션에서 이미 표시됨)');
        }
      }
    }
    return;
  }

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
