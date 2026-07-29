/* =====================================================
   smartstore-search.js - 도매꾹 전체 필드 실시간 검색
   ===================================================== */

let domaggukSearchQuery = '';
let domaggukSearchInputEl = null;
let domaggukSearchClearEl = null;
let domaggukToggleAllBtn = null;

/** 검색 UI 초기화 */
function initDOMAGGUKSearch() {
  domaggukSearchInputEl = document.getElementById('search-input');
  domaggukSearchClearEl = document.getElementById('search-clear');
  domaggukToggleAllBtn  = document.getElementById('btn-toggle-all');

  domaggukSearchInputEl.placeholder = DOMAGGUK_CONFIG.MESSAGES.SEARCH_PLACEHOLDER;

  domaggukSearchInputEl.addEventListener('input', (e) => {
    domaggukSearchQuery = e.target.value;
    renderDOMAGGUK();
  });

  domaggukSearchClearEl.addEventListener('click', () => {
    domaggukSearchInputEl.value = '';
    domaggukSearchQuery = '';
    renderDOMAGGUK();
    domaggukSearchInputEl.focus();
  });

  if (domaggukToggleAllBtn) {
    domaggukToggleAllBtn.addEventListener('click', () => {
      const collapse = domaggukToggleAllBtn.dataset.action === 'collapse';
      toggleAllDOMAGGUKCards(collapse);
    });
  }
}

/** 카드의 모든 텍스트 필드를 검색 가능한 문자열로 변환 */
function domaggukCardSearchText(card) {
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
function matchesDOMAGGUKQuery(card, q) {
  if (!q) return true;
  return domaggukCardSearchText(card).includes(q.toLowerCase());
}

/** 전체 숨기기/펼치기 버튼 라벨 및 상태 갱신 */
function updateDOMAGGUKToggleAllButton() {
  if (!domaggukToggleAllBtn) return;
  const allCollapsed = domaggukState.cards.length > 0 && domaggukState.cards.every(c => c.isCollapsed);
  if (allCollapsed) {
    domaggukToggleAllBtn.textContent = DOMAGGUK_CONFIG.MESSAGES.BTN_EXPAND_ALL;
    domaggukToggleAllBtn.dataset.action = 'expand';
    domaggukToggleAllBtn.title = '모든 카드 상세 정보 펼치기';
  } else {
    domaggukToggleAllBtn.textContent = DOMAGGUK_CONFIG.MESSAGES.BTN_COLLAPSE_ALL;
    domaggukToggleAllBtn.dataset.action = 'collapse';
    domaggukToggleAllBtn.title = '모든 카드 상세 정보 숨기기';
  }
}

/** 검색 결과 수 갱신 */
function updateDOMAGGUKSearchCount() {
  const countEl = document.getElementById('search-count');
  if (!countEl) return;
  const q = domaggukSearchQuery.trim();
  if (!q) {
    countEl.textContent = domaggukState.cards.length > 0
      ? `전체 ${domaggukState.cards.length}개`
      : '';
  } else {
    const n = domaggukState.cards.filter(c => matchesDOMAGGUKQuery(c, q)).length;
    countEl.textContent = `${n}개 / 전체 ${domaggukState.cards.length}개`;
  }
}
