/* =====================================================
   nshipping-app.js - N배송 페이지 초기화
   ===================================================== */

/** DOM 로드 후 각 모듈 초기화 */
function initNshipping() {
  if (!requireAuthenticatedPage()) return;
  // 페이지 제목 설정
  document.title = NSHIPPING_CONFIG.PAGE_TITLE;
  const titleEl = document.querySelector('.topbar .title');
  if (titleEl) titleEl.textContent = NSHIPPING_CONFIG.PAGE_HEADER;

  initToast();
  initModal();
  initNshippingBoard();
  initNshippingSearch();
  initMenu();
  initNshippingActions();
  bindNshippingKeyboardShortcuts();
  bindNshippingPageLifecycle();

  loadNshipping();

  if (nshippingState.cards.length === 0) {
    nshippingState.cards.push(newNshippingCard());
  }

  // 상품리스트 최신 데이터로 최종원가 등 자동 연동 필드 재계산
  resolveNshippingCards();
  reportSaveResult(saveNshipping(), NSHIPPING_CONFIG.MESSAGES);

  renderNshipping();

  // 다른 탭에서 상품리스트 데이터가 수정되면 자동으로 재연동
  window.addEventListener('storage', (e) => {
    if (e.key === NSHIPPING_CONFIG.PRODUCTLIST_STORAGE_KEY) {
      resolveNshippingCards();
      reportSaveResult(saveNshipping(), NSHIPPING_CONFIG.MESSAGES);
      renderNshipping();
    }
  });
}

/** 페이지가 bfcache에서 복원될 때도 최신 데이터로 재연동 */
function bindNshippingPageLifecycle() {
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      resolveNshippingCards();
      reportSaveResult(saveNshipping(), NSHIPPING_CONFIG.MESSAGES);
      renderNshipping();
    }
  });

  // 페이지를 벗어나기 전에 혹시 모를 미저장 변경사항 저장
  window.addEventListener('beforeunload', () => {
    reportSaveResult(saveNshipping(), NSHIPPING_CONFIG.MESSAGES);
  });
}

/** 키보드 단축키 */
function bindNshippingKeyboardShortcuts() {
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
      reportSaveResult(saveNshipping(), NSHIPPING_CONFIG.MESSAGES, NSHIPPING_CONFIG.MESSAGES.SAVED);
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.focus();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNshipping);
} else {
  initNshipping();
}
