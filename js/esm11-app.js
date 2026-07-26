/* =====================================================
   esm11-app.js - ESM/11번가 페이지 초기화
   ===================================================== */

/** DOM 로드 후 각 모듈 초기화 */
function initEsm11() {
  // 페이지 제목 설정
  document.title = ESM11_CONFIG.PAGE_TITLE;
  const titleEl = document.querySelector('.topbar .title');
  if (titleEl) titleEl.textContent = ESM11_CONFIG.PAGE_HEADER;

  initToast();
  initModal();
  initEsm11Board();
  initEsm11Search();
  initMenu();
  initEsm11Actions();
  bindEsm11KeyboardShortcuts();
  bindEsm11PageLifecycle();

  loadEsm11();

  // 데이터가 비어있고 백업이 있다면 복구
  if (esm11State.cards.length === 0) {
    const backupRaw = localStorage.getItem(ESM11_CONFIG.STORAGE_KEY + '_backup');
    if (backupRaw) {
      try {
        const backup = JSON.parse(backupRaw);
        if (Array.isArray(backup) && backup.length > 0) {
          esm11State.cards = backup;
          saveEsm11();
        }
      } catch (e) { /* ignore */ }
    }
  }

  if (esm11State.cards.length === 0) {
    esm11State.cards.push(newEsm11Card());
  }

  // 상품리스트 최신 데이터로 최종원가 등 자동 연동 필드 재계산
  resolveEsm11Cards();
  saveEsm11();

  renderEsm11();

  // 다른 탭에서 상품리스트 데이터가 수정되면 자동으로 재연동
  window.addEventListener('storage', (e) => {
    if (e.key === ESM11_CONFIG.PRODUCTLIST_STORAGE_KEY) {
      resolveEsm11Cards();
      saveEsm11();
      renderEsm11();
    }
  });
}

/** 페이지가 bfcache에서 복원될 때도 최신 데이터로 재연동 */
function bindEsm11PageLifecycle() {
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      resolveEsm11Cards();
      saveEsm11();
      renderEsm11();
    }
  });

  // 페이지를 벗어나기 전에 혹시 모를 미저장 변경사항 저장
  window.addEventListener('beforeunload', () => {
    saveEsm11();
  });
}

/** 키보드 단축키 */
function bindEsm11KeyboardShortcuts() {
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
      saveEsm11();
      showToast(ESM11_CONFIG.MESSAGES.SAVED);
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.focus();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEsm11);
} else {
  initEsm11();
}
