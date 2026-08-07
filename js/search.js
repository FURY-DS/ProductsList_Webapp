/* =====================================================
   search.js - 전체 필드 실시간 검색
   ===================================================== */

let searchQuery = '';
let searchInputEl = null;
let searchClearEl = null;
let toggleAllBtn = null;

/** 검색 UI 초기화 (DOM 로드 후 호출) */
function initSearch() {
  searchInputEl = document.getElementById('search-input');
  searchClearEl = document.getElementById('search-clear');
  toggleAllBtn  = document.getElementById('btn-toggle-all');

  searchInputEl.placeholder = CONFIG.MESSAGES.SEARCH_PLACEHOLDER;

  searchInputEl.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    render();
  });

  searchClearEl.addEventListener('click', () => {
    searchInputEl.value = '';
    searchQuery = '';
    render();
    searchInputEl.focus();
  });

  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const collapse = toggleAllBtn.dataset.action === 'collapse';
      toggleAllCards(collapse);
    });
  }
}

/** 카드의 모든 텍스트 필드를 검색 가능한 문자열로 변환 */
function cardSearchText(card) {
  const total = computeTotal(card);
  return [
    card.name, card.option, card.origin, card.status, card.rocket, card.nshipping,
    card.product, card.ny, card.link, card.link2,
    card.cost, card.rate, card.percent, total, total.toFixed(2)
  ].join(' ').toLowerCase();
}

/** 검색어와 카드 일치 여부 */
function matchesQuery(card, q) {
  if (!q) return true;
  return cardSearchText(card).includes(q.toLowerCase());
}

/** 전체 숨기기/펼치기 버튼 라벨 및 상태 갱신 */
function updateToggleAllButton() {
  if (!toggleAllBtn) return;
  const allCollapsed = state.cards.length > 0 && state.cards.every(c => c.isCollapsed);
  if (allCollapsed) {
    toggleAllBtn.textContent = CONFIG.MESSAGES.BTN_EXPAND_ALL;
    toggleAllBtn.dataset.action = 'expand';
    toggleAllBtn.title = '모든 카드 상세 정보 펼치기';
  } else {
    toggleAllBtn.textContent = CONFIG.MESSAGES.BTN_COLLAPSE_ALL;
    toggleAllBtn.dataset.action = 'collapse';
    toggleAllBtn.title = '모든 카드 상세 정보 숨기기';
  }
}

function updateSearchCount() {
  const countEl = document.getElementById('search-count');
  if (!countEl) return;
  const q = searchQuery.trim();
  if (!q) {
    countEl.textContent = state.cards.length > 0
      ? `전체 ${state.cards.length}개`
      : '';
  } else {
    const n = state.cards.filter(c => matchesQuery(c, q)).length;
    countEl.textContent = `${n}개 / 전체 ${state.cards.length}개`;
  }
}
