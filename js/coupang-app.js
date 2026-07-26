/* =====================================================
   coupang-app.js - 쿠팡 페이지 초기화
   ===================================================== */

/** DOM 로드 후 각 모듈 초기화 */
function initCoupang() {
  // 페이지 제목 설정
  document.title = COUPANG_CONFIG.PAGE_TITLE;
  const titleEl = document.querySelector('.topbar .title');
  if (titleEl) titleEl.textContent = COUPANG_CONFIG.PAGE_HEADER;

  initToast();
  initModal();
  initCoupangBoard();
  initCoupangSearch();
  initMenu();
  initCoupangActions();
  bindCoupangKeyboardShortcuts();
  bindCoupangPageLifecycle();

  loadCoupang();

  // 데이터가 비어있고 백업이 있다면 복구
  if (coupangState.cards.length === 0) {
    const backupRaw = localStorage.getItem(COUPANG_CONFIG.STORAGE_KEY + '_backup');
    if (backupRaw) {
      try {
        const backup = JSON.parse(backupRaw);
        if (Array.isArray(backup) && backup.length > 0) {
          coupangState.cards = backup;
          reportSaveResult(saveCoupang(), COUPANG_CONFIG.MESSAGES);
        }
      } catch (e) { /* ignore */ }
    }
  }

  if (coupangState.cards.length === 0) {
    coupangState.cards.push(newCoupangCard());
  }

  // 상품리스트 최신 데이터로 최종원가 등 자동 연동 필드 재계산
  resolveCoupangCards();
  reportSaveResult(saveCoupang(), COUPANG_CONFIG.MESSAGES);

  renderCoupang();

  // 다른 탭에서 상품리스트 데이터가 수정되면 자동으로 재연동
  window.addEventListener('storage', (e) => {
    if (e.key === COUPANG_CONFIG.PRODUCTLIST_STORAGE_KEY) {
      resolveCoupangCards();
      reportSaveResult(saveCoupang(), COUPANG_CONFIG.MESSAGES);
      renderCoupang();
    }
  });
}

/** 페이지가 bfcache에서 복원될 때도 최신 데이터로 재연동 */
function bindCoupangPageLifecycle() {
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      resolveCoupangCards();
      reportSaveResult(saveCoupang(), COUPANG_CONFIG.MESSAGES);
      renderCoupang();
    }
  });

  // 페이지를 벗어나기 전에 혹시 모를 미저장 변경사항 저장
  window.addEventListener('beforeunload', () => {
    reportSaveResult(saveCoupang(), COUPANG_CONFIG.MESSAGES);
  });
}

/** 키보드 단축키 */
function bindCoupangKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
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

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      reportSaveResult(saveCoupang(), COUPANG_CONFIG.MESSAGES, COUPANG_CONFIG.MESSAGES.SAVED);
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.focus();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCoupang);
} else {
  initCoupang();
}
