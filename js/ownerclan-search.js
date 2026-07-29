/* =====================================================
   smartstore-search.js - 오너클랜 전체 필드 실시간 검색
   ===================================================== */

let ownerclanSearchQuery = '';
let ownerclanSearchInputEl = null;
let ownerclanSearchClearEl = null;
let ownerclanToggleAllBtn = null;

/** 검색 UI 초기화 */
function initOWNERCLANSearch() {
  ownerclanSearchInputEl = document.getElementById('search-input');
  ownerclanSearchClearEl = document.getElementById('search-clear');
  ownerclanToggleAllBtn  = document.getElementById('btn-toggle-all');

  ownerclanSearchInputEl.placeholder = OWNERCLAN_CONFIG.MESSAGES.SEARCH_PLACEHOLDER;

  ownerclanSearchInputEl.addEventListener('input', (e) => {
    ownerclanSearchQuery = e.target.value;
    renderOWNERCLAN();
  });

  ownerclanSearchClearEl.addEventListener('click', () => {
    ownerclanSearchInputEl.value = '';
    ownerclanSearchQuery = '';
    renderOWNERCLAN();
    ownerclanSearchInputEl.focus();
  });

  if (ownerclanToggleAllBtn) {
    ownerclanToggleAllBtn.addEventListener('click', () => {
      const collapse = ownerclanToggleAllBtn.dataset.action === 'collapse';
      toggleAllOWNERCLANCards(collapse);
    });
  }
}

/** 카드의 모든 텍스트 필드를 검색 가능한 문자열로 변환 */
function ownerclanCardSearchText(card) {
  const parts = [
    card.sellerCode,
    card.name,
    card.option,
    card.finalCost,
    card.sellingPrice,
    card.feeRate,
    card.feeAmount,
    card.warehouseFee,
    card.marketFee,
    card.finalProfit
  ];
  if (Array.isArray(card.bundleItems)) {
    card.bundleItems.forEach(item => {
      parts.push(item.sellerCode, item.name, item.option, item.total);
    });
  }
  return parts.join(' ').toLowerCase();
}

/** 검색어와 카드 일치 여부 */
function matchesOWNERCLANQuery(card, q) {
  if (!q) return true;
  return ownerclanCardSearchText(card).includes(q.toLowerCase());
}

/** 전체 숨기기/펼치기 버튼 라벨 및 상태 갱신 */
function updateOWNERCLANToggleAllButton() {
  if (!ownerclanToggleAllBtn) return;
  const allCollapsed = ownerclanState.cards.length > 0 && ownerclanState.cards.every(c => c.isCollapsed);
  if (allCollapsed) {
    ownerclanToggleAllBtn.textContent = OWNERCLAN_CONFIG.MESSAGES.BTN_EXPAND_ALL;
    ownerclanToggleAllBtn.dataset.action = 'expand';
    ownerclanToggleAllBtn.title = '모든 카드 상세 정보 펼치기';
  } else {
    ownerclanToggleAllBtn.textContent = OWNERCLAN_CONFIG.MESSAGES.BTN_COLLAPSE_ALL;
    ownerclanToggleAllBtn.dataset.action = 'collapse';
    ownerclanToggleAllBtn.title = '모든 카드 상세 정보 숨기기';
  }
}

/** 검색 결과 수 갱신 */
function updateOWNERCLANSearchCount() {
  const countEl = document.getElementById('search-count');
  if (!countEl) return;
  const q = ownerclanSearchQuery.trim();
  if (!q) {
    countEl.textContent = ownerclanState.cards.length > 0
      ? `전체 ${ownerclanState.cards.length}개`
      : '';
  } else {
    const n = ownerclanState.cards.filter(c => matchesOWNERCLANQuery(c, q)).length;
    countEl.textContent = `${n}개 / 전체 ${ownerclanState.cards.length}개`;
  }
}
