/* =====================================================
   app.js - 앱 초기화, 키보드 단축키, 부팅
   ===================================================== */

/** DOM 로드 후 각 모듈 초기화 */
function init() {
  initToast();
  initModal();
  initBoard();
  initSearch();
  initMenu();
  initActions();
  bindKeyboardShortcuts();

  // 데이터 로드
  load();

  // 첫 실행 시 카드 1개 생성
  if (state.cards.length === 0) {
    state.cards.push(newCard());
  }

  // 첫 렌더링
  render();
}

/** 키보드 단축키 바인딩 */
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
      save();
      showToast(CONFIG.MESSAGES.SAVED);
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
