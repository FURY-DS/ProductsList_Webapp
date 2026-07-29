/* =====================================================
   smartstore-search.js - 토스쇼핑 전체 필드 실시간 검색
   ===================================================== */

let tossshoppingSearchQuery = '';
let tossshoppingSearchInputEl = null;
let tossshoppingSearchClearEl = null;
let tossshoppingToggleAllBtn = null;

/** 검색 UI 초기화 */
function initTOSSSHOPPINGSearch() {
  tossshoppingSearchInputEl = document.getElementById('search-input');
  tossshoppingSearchClearEl = document.getElementById('search-clear');
  tossshoppingToggleAllBtn  = document.getElementById('btn-toggle-all');

  tossshoppingSearchInputEl.placeholder = TOSSSHOPPING_CONFIG.MESSAGES.SEARCH_PLACEHOLDER;

  tossshoppingSearchInputEl.addEventListener('input', (e) => {
    tossshoppingSearchQuery = e.target.value;
    renderTOSSSHOPPING();
  });

  tossshoppingSearchClearEl.addEventListener('click', () => {
    tossshoppingSearchInputEl.value = '';
    tossshoppingSearchQuery = '';
    renderTOSSSHOPPING();
    tossshoppingSearchInputEl.focus();
  });

  if (tossshoppingToggleAllBtn) {
    tossshoppingToggleAllBtn.addEventListener('click', () => {
      const collapse = tossshoppingToggleAllBtn.dataset.action === 'collapse';
      toggleAllTOSSSHOPPINGCards(collapse);
    });
  }
}

/** 카드의 모든 텍스트 필드를 검색 가능한 문자열로 변환 */
function tossshoppingCardSearchText(card) {
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
function matchesTOSSSHOPPINGQuery(card, q) {
  if (!q) return true;
  return tossshoppingCardSearchText(card).includes(q.toLowerCase());
}

/** 전체 숨기기/펼치기 버튼 라벨 및 상태 갱신 */
function updateTOSSSHOPPINGToggleAllButton() {
  if (!tossshoppingToggleAllBtn) return;
  const allCollapsed = tossshoppingState.cards.length > 0 && tossshoppingState.cards.every(c => c.isCollapsed);
  if (allCollapsed) {
    tossshoppingToggleAllBtn.textContent = TOSSSHOPPING_CONFIG.MESSAGES.BTN_EXPAND_ALL;
    tossshoppingToggleAllBtn.dataset.action = 'expand';
    tossshoppingToggleAllBtn.title = '모든 카드 상세 정보 펼치기';
  } else {
    tossshoppingToggleAllBtn.textContent = TOSSSHOPPING_CONFIG.MESSAGES.BTN_COLLAPSE_ALL;
    tossshoppingToggleAllBtn.dataset.action = 'collapse';
    tossshoppingToggleAllBtn.title = '모든 카드 상세 정보 숨기기';
  }
}

/** 검색 결과 수 갱신 */
function updateTOSSSHOPPINGSearchCount() {
  const countEl = document.getElementById('search-count');
  if (!countEl) return;
  const q = tossshoppingSearchQuery.trim();
  if (!q) {
    countEl.textContent = tossshoppingState.cards.length > 0
      ? `전체 ${tossshoppingState.cards.length}개`
      : '';
  } else {
    const n = tossshoppingState.cards.filter(c => matchesTOSSSHOPPINGQuery(c, q)).length;
    countEl.textContent = `${n}개 / 전체 ${tossshoppingState.cards.length}개`;
  }
}
