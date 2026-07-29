/* =====================================================
   smartstore-app.js - 올웨이즈 페이지 초기화
   ===================================================== */

/** DOM 로드 후 각 모듈 초기화 */
function initALWAYS() {
  // 페이지 제목 설정
  document.title = ALWAYS_CONFIG.PAGE_TITLE;
  const titleEl = document.querySelector('.topbar .title');
  if (titleEl) titleEl.textContent = ALWAYS_CONFIG.PAGE_HEADER;

  initToast();
  initModal();
  initALWAYSBoard();
  initALWAYSSearch();
  initMenu();
  initALWAYSActions();
  bindALWAYSKeyboardShortcuts();
  bindALWAYSPageLifecycle();

  loadALWAYS();

  if (alwaysState.cards.length === 0) {
    alwaysState.cards.push(newALWAYSCard());
  }

  // 상품리스트 최신 데이터로 최종원가 등 자동 연동 필드 재계산
  resolveALWAYSCards();
  reportSaveResult(saveALWAYS(), ALWAYS_CONFIG.MESSAGES);

  renderALWAYS();

  // 다른 탭에서 상품리스트 데이터가 수정되면 자동으로 재연동
  window.addEventListener('storage', (e) => {
    if (e.key === ALWAYS_CONFIG.PRODUCTLIST_STORAGE_KEY) {
      resolveALWAYSCards();
      reportSaveResult(saveALWAYS(), ALWAYS_CONFIG.MESSAGES);
      renderALWAYS();
    }
  });
}

/** 페이지가 bfcache에서 복원될 때도 최신 데이터로 재연동 */
function bindALWAYSPageLifecycle() {
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      resolveALWAYSCards();
      reportSaveResult(saveALWAYS(), ALWAYS_CONFIG.MESSAGES);
      renderALWAYS();
    }
  });

  // 페이지를 벗어나기 전에 혹시 모를 미저장 변경사항 저장
  window.addEventListener('beforeunload', () => {
    reportSaveResult(saveALWAYS(), ALWAYS_CONFIG.MESSAGES);
  });
}

/** 키보드 단축키 */
function bindALWAYSKeyboardShortcuts() {
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
      reportSaveResult(saveALWAYS(), ALWAYS_CONFIG.MESSAGES, ALWAYS_CONFIG.MESSAGES.SAVED);
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.focus();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initALWAYS);
} else {
  initALWAYS();
}
