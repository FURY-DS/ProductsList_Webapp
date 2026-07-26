/* =====================================================
   smartstore-app.js - 스마트스토어 페이지 초기화
   ===================================================== */

/** DOM 로드 후 각 모듈 초기화 */
function initSmartstore() {
  // 페이지 제목 설정
  document.title = SMARTSTORE_CONFIG.PAGE_TITLE;
  const titleEl = document.querySelector('.topbar .title');
  if (titleEl) titleEl.textContent = SMARTSTORE_CONFIG.PAGE_HEADER;

  initToast();
  initModal();
  initSmartstoreBoard();
  initSmartstoreSearch();
  initMenu();
  initSmartstoreActions();
  bindSmartstoreKeyboardShortcuts();
  bindSmartstorePageLifecycle();

  loadSmartstore();

  // 데이터가 비어있고 백업이 있다면 복구
  if (smartstoreState.cards.length === 0) {
    const backupRaw = localStorage.getItem(SMARTSTORE_CONFIG.STORAGE_KEY + '_backup');
    if (backupRaw) {
      try {
        const backup = JSON.parse(backupRaw);
        if (Array.isArray(backup) && backup.length > 0) {
          smartstoreState.cards = backup;
          saveSmartstore();
        }
      } catch (e) { /* ignore */ }
    }
  }

  if (smartstoreState.cards.length === 0) {
    smartstoreState.cards.push(newSmartstoreCard());
  }

  // 상품리스트 최신 데이터로 최종원가 등 자동 연동 필드 재계산
  resolveSmartstoreCards();
  saveSmartstore();

  renderSmartstore();

  // 다른 탭에서 상품리스트 데이터가 수정되면 자동으로 재연동
  window.addEventListener('storage', (e) => {
    if (e.key === SMARTSTORE_CONFIG.PRODUCTLIST_STORAGE_KEY) {
      resolveSmartstoreCards();
      saveSmartstore();
      renderSmartstore();
    }
  });
}

/** 페이지가 bfcache에서 복원될 때도 최신 데이터로 재연동 */
function bindSmartstorePageLifecycle() {
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      resolveSmartstoreCards();
      saveSmartstore();
      renderSmartstore();
    }
  });

  // 페이지를 벗어나기 전에 혹시 모를 미저장 변경사항 저장
  window.addEventListener('beforeunload', () => {
    saveSmartstore();
  });
}

/** 키보드 단축키 */
function bindSmartstoreKeyboardShortcuts() {
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
      saveSmartstore();
      showToast(SMARTSTORE_CONFIG.MESSAGES.SAVED);
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.focus();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSmartstore);
} else {
  initSmartstore();
}
