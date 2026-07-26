/* =====================================================
   smartstore-search.js - 스마트스토어 전체 필드 실시간 검색
   ===================================================== */

let smartstoreSearchQuery = '';
let smartstoreSearchInputEl = null;
let smartstoreSearchClearEl = null;
let smartstoreToggleAllBtn = null;

/** 검색 UI 초기화 */
function initSmartstoreSearch() {
  smartstoreSearchInputEl = document.getElementById('search-input');
  smartstoreSearchClearEl = document.getElementById('search-clear');
  smartstoreToggleAllBtn  = document.getElementById('btn-toggle-all');

  smartstoreSearchInputEl.placeholder = SMARTSTORE_CONFIG.MESSAGES.SEARCH_PLACEHOLDER;

  smartstoreSearchInputEl.addEventListener('input', (e) => {
    smartstoreSearchQuery = e.target.value;
    renderSmartstore();
  });

  smartstoreSearchClearEl.addEventListener('click', () => {
    smartstoreSearchInputEl.value = '';
    smartstoreSearchQuery = '';
    renderSmartstore();
    smartstoreSearchInputEl.focus();
  });

  if (smartstoreToggleAllBtn) {
    smartstoreToggleAllBtn.addEventListener('click', () => {
      const collapse = smartstoreToggleAllBtn.dataset.action === 'collapse';
      toggleAllSmartstoreCards(collapse);
    });
  }
}

/** 카드의 모든 텍스트 필드를 검색 가능한 문자열로 변환 */
function smartstoreCardSearchText(card) {
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
function matchesSmartstoreQuery(card, q) {
  if (!q) return true;
  return smartstoreCardSearchText(card).includes(q.toLowerCase());
}

/** 전체 숨기기/펼치기 버튼 라벨 및 상태 갱신 */
function updateSmartstoreToggleAllButton() {
  if (!smartstoreToggleAllBtn) return;
  const allCollapsed = smartstoreState.cards.length > 0 && smartstoreState.cards.every(c => c.isCollapsed);
  if (allCollapsed) {
    smartstoreToggleAllBtn.textContent = SMARTSTORE_CONFIG.MESSAGES.BTN_EXPAND_ALL;
    smartstoreToggleAllBtn.dataset.action = 'expand';
    smartstoreToggleAllBtn.title = '모든 카드 상세 정보 펼치기';
  } else {
    smartstoreToggleAllBtn.textContent = SMARTSTORE_CONFIG.MESSAGES.BTN_COLLAPSE_ALL;
    smartstoreToggleAllBtn.dataset.action = 'collapse';
    smartstoreToggleAllBtn.title = '모든 카드 상세 정보 숨기기';
  }
}

/** 검색 결과 수 갱신 */
function updateSmartstoreSearchCount() {
  const countEl = document.getElementById('search-count');
  if (!countEl) return;
  const q = smartstoreSearchQuery.trim();
  if (!q) {
    countEl.textContent = smartstoreState.cards.length > 0
      ? `전체 ${smartstoreState.cards.length}개`
      : '';
  } else {
    const n = smartstoreState.cards.filter(c => matchesSmartstoreQuery(c, q)).length;
    countEl.textContent = `${n}개 / 전체 ${smartstoreState.cards.length}개`;
  }
}
