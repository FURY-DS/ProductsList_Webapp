/* =====================================================
   nshipping-search.js - N배송 전체 필드 실시간 검색
   ===================================================== */

let nshippingSearchQuery = '';
let nshippingSearchInputEl = null;
let nshippingSearchClearEl = null;
let nshippingToggleAllBtn = null;

/** 검색 UI 초기화 */
function initNshippingSearch() {
  nshippingSearchInputEl = document.getElementById('search-input');
  nshippingSearchClearEl = document.getElementById('search-clear');
  nshippingToggleAllBtn  = document.getElementById('btn-toggle-all');

  nshippingSearchInputEl.placeholder = NSHIPPING_CONFIG.MESSAGES.SEARCH_PLACEHOLDER;

  nshippingSearchInputEl.addEventListener('input', (e) => {
    nshippingSearchQuery = e.target.value;
    renderNshipping();
  });

  nshippingSearchClearEl.addEventListener('click', () => {
    nshippingSearchInputEl.value = '';
    nshippingSearchQuery = '';
    renderNshipping();
    nshippingSearchInputEl.focus();
  });

  if (nshippingToggleAllBtn) {
    nshippingToggleAllBtn.addEventListener('click', () => {
      const collapse = nshippingToggleAllBtn.dataset.action === 'collapse';
      toggleAllNshippingCards(collapse);
    });
  }
}

/** 카드의 모든 텍스트 필드를 검색 가능한 문자열로 변환 */
function nshippingCardSearchText(card) {
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
    card.barcodeFee,
    card.pickingFee,
    card.tagFee,
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
function matchesNshippingQuery(card, q) {
  if (!q) return true;
  return nshippingCardSearchText(card).includes(q.toLowerCase());
}

/** 전체 숨기기/펼치기 버튼 라벨 및 상태 갱신 */
function updateNshippingToggleAllButton() {
  if (!nshippingToggleAllBtn) return;
  const allCollapsed = nshippingState.cards.length > 0 && nshippingState.cards.every(c => c.isCollapsed);
  if (allCollapsed) {
    nshippingToggleAllBtn.textContent = NSHIPPING_CONFIG.MESSAGES.BTN_EXPAND_ALL;
    nshippingToggleAllBtn.dataset.action = 'expand';
    nshippingToggleAllBtn.title = '모든 카드 상세 정보 펼치기';
  } else {
    nshippingToggleAllBtn.textContent = NSHIPPING_CONFIG.MESSAGES.BTN_COLLAPSE_ALL;
    nshippingToggleAllBtn.dataset.action = 'collapse';
    nshippingToggleAllBtn.title = '모든 카드 상세 정보 숨기기';
  }
}

/** 검색 결과 수 갱신 */
function updateNshippingSearchCount() {
  const countEl = document.getElementById('search-count');
  if (!countEl) return;
  const q = nshippingSearchQuery.trim();
  if (!q) {
    countEl.textContent = nshippingState.cards.length > 0
      ? `전체 ${nshippingState.cards.length}개`
      : '';
  } else {
    const n = nshippingState.cards.filter(c => matchesNshippingQuery(c, q)).length;
    countEl.textContent = `${n}개 / 전체 ${nshippingState.cards.length}개`;
  }
}
