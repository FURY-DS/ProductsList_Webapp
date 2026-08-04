/* =====================================================
   smartstore-app.js - 토스쇼핑 페이지 초기화
   ===================================================== */

/** DOM 로드 후 각 모듈 초기화 */
async function initTOSSSHOPPING() {
  if (!requireAuthenticatedPage()) return;
  // 페이지 제목 설정
  document.title = TOSSSHOPPING_CONFIG.PAGE_TITLE;
  const titleEl = document.querySelector('.topbar .title');
  if (titleEl) titleEl.textContent = TOSSSHOPPING_CONFIG.PAGE_HEADER;

  initToast();
  initModal();
  initTOSSSHOPPINGBoard();
  initTOSSSHOPPINGSearch();
  initMenu();
  initTOSSSHOPPINGActions();
  bindTOSSSHOPPINGKeyboardShortcuts();
  bindTOSSSHOPPINGPageLifecycle();

  // 계정이 신규/삭제된 상태면 (서버 메인 데이터 비어있음) localStorage의 페이지 데이터 + 상품리스트 데이터 정리
  await clearStalePageDataIfServerEmpty([TOSSSHOPPING_CONFIG.STORAGE_KEY, TOSSSHOPPING_CONFIG.PRODUCTLIST_STORAGE_KEY]);

  loadTOSSSHOPPING();

  // 상품리스트 최신 데이터로 최종원가 등 자동 연동 필드 재계산
  resolveTOSSSHOPPINGCards();
  reportSaveResult(saveTOSSSHOPPING(), TOSSSHOPPING_CONFIG.MESSAGES);

  renderTOSSSHOPPING();

  // 다른 탭에서 상품리스트 데이터가 수정되면 자동으로 재연동
  window.addEventListener('storage', (e) => {
    if (e.key === TOSSSHOPPING_CONFIG.PRODUCTLIST_STORAGE_KEY) {
      resolveTOSSSHOPPINGCards();
      reportSaveResult(saveTOSSSHOPPING(), TOSSSHOPPING_CONFIG.MESSAGES);
      renderTOSSSHOPPING();
    }
  });
}

/** 페이지가 bfcache에서 복원될 때도 최신 데이터로 재연동 */
function bindTOSSSHOPPINGPageLifecycle() {
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      resolveTOSSSHOPPINGCards();
      reportSaveResult(saveTOSSSHOPPING(), TOSSSHOPPING_CONFIG.MESSAGES);
      renderTOSSSHOPPING();
    }
  });

  // 페이지를 벗어나기 전에 혹시 모를 미저장 변경사항 저장
  window.addEventListener('beforeunload', () => {
    reportSaveResult(saveTOSSSHOPPING(), TOSSSHOPPING_CONFIG.MESSAGES);
  });
}

/** 키보드 단축키 */
function bindTOSSSHOPPINGKeyboardShortcuts() {
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
      reportSaveResult(saveTOSSSHOPPING(), TOSSSHOPPING_CONFIG.MESSAGES, TOSSSHOPPING_CONFIG.MESSAGES.SAVED);
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.focus();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTOSSSHOPPING);
} else {
  initTOSSSHOPPING();
}
