/* =====================================================
   smartstore-app.js - 오너클랜 페이지 초기화
   ===================================================== */

/** DOM 로드 후 각 모듈 초기화 */
async function initOWNERCLAN() {
  if (!requireAuthenticatedPage()) return;
  // 페이지 제목 설정
  document.title = OWNERCLAN_CONFIG.PAGE_TITLE;
  const titleEl = document.querySelector('.topbar .title');
  if (titleEl) titleEl.textContent = OWNERCLAN_CONFIG.PAGE_HEADER;

  initToast();
  initModal();
  initOWNERCLANBoard();
  initOWNERCLANSearch();
  initMenu();
  initOWNERCLANActions();
  bindOWNERCLANKeyboardShortcuts();
  bindOWNERCLANPageLifecycle();

  // 계정이 신규/삭제된 상태면 (서버 메인 데이터 비어있음) localStorage의 페이지 데이터 + 마켓노트 데이터 정리
  await clearStalePageDataIfServerEmpty([OWNERCLAN_CONFIG.STORAGE_KEY, OWNERCLAN_CONFIG.PRODUCTLIST_STORAGE_KEY], OWNERCLAN_CONFIG.STORAGE_KEY);

  loadOWNERCLAN();

  // === cloud-sync-init ===
  CloudSync.init(OWNERCLAN_CONFIG.STORAGE_KEY);
  await cloudPullAndRenderPage(OWNERCLAN_CONFIG, ownerclanState || state, newOWNERCLANCard, renderOWNERCLAN);
  startPageAutoSync(OWNERCLAN_CONFIG, ownerclanState || state, newOWNERCLANCard, renderOWNERCLAN, 10000);

  // 마켓노트 최신 데이터로 최종원가 등 자동 연동 필드 재계산
  resolveOWNERCLANCards();
  reportSaveResult(saveOWNERCLAN(), OWNERCLAN_CONFIG.MESSAGES);

  renderOWNERCLAN();

  // 다른 탭에서 마켓노트 데이터가 수정되면 자동으로 재연동
  window.addEventListener('storage', (e) => {
    if (e.key === OWNERCLAN_CONFIG.PRODUCTLIST_STORAGE_KEY) {
      resolveOWNERCLANCards();
      reportSaveResult(saveOWNERCLAN(), OWNERCLAN_CONFIG.MESSAGES);
      renderOWNERCLAN();
    }
  });
}

/** 페이지가 bfcache에서 복원될 때도 최신 데이터로 재연동 */
function bindOWNERCLANPageLifecycle() {
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      resolveOWNERCLANCards();
      reportSaveResult(saveOWNERCLAN(), OWNERCLAN_CONFIG.MESSAGES);
      renderOWNERCLAN();
    }
  });

  // 수동 클라우드 동기화 버튼
  const btnCloudSync = document.getElementById('btn-cloud-sync');
  if (btnCloudSync) {
    btnCloudSync.addEventListener('click', () => manualCloudSyncPage(OWNERCLAN_CONFIG, ownerclanState || state, newOWNERCLANCard, renderOWNERCLAN));
  }

  // 페이지를 벗어나기 전에 혹시 모를 미저장 변경사항 저장
  window.addEventListener('beforeunload', () => {
    reportSaveResult(saveOWNERCLAN(), OWNERCLAN_CONFIG.MESSAGES);
  });
}

/** 키보드 단축키 */
function bindOWNERCLANKeyboardShortcuts() {
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
      reportSaveResult(saveOWNERCLAN(), OWNERCLAN_CONFIG.MESSAGES, OWNERCLAN_CONFIG.MESSAGES.SAVED);
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.focus();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOWNERCLAN);
} else {
  initOWNERCLAN();
}
