/* =====================================================
   rocketgrowth-search.js - 로켓그로스 전체 필드 실시간 검색
   ===================================================== */

let rocketgrowthSearchQuery = '';
let rocketgrowthSearchInputEl = null;
let rocketgrowthSearchClearEl = null;
let rocketgrowthToggleAllBtn = null;

/** 검색 UI 초기화 */
function initRocketgrowthSearch() {
  rocketgrowthSearchInputEl = document.getElementById('search-input');
  rocketgrowthSearchClearEl = document.getElementById('search-clear');
  rocketgrowthToggleAllBtn  = document.getElementById('btn-toggle-all');

  rocketgrowthSearchInputEl.placeholder = ROCKETGROWTH_CONFIG.MESSAGES.SEARCH_PLACEHOLDER;

  rocketgrowthSearchInputEl.addEventListener('input', (e) => {
    rocketgrowthSearchQuery = e.target.value;
    renderRocketgrowth();
  });

  rocketgrowthSearchClearEl.addEventListener('click', () => {
    rocketgrowthSearchInputEl.value = '';
    rocketgrowthSearchQuery = '';
    renderRocketgrowth();
    rocketgrowthSearchInputEl.focus();
  });

  if (rocketgrowthToggleAllBtn) {
    rocketgrowthToggleAllBtn.addEventListener('click', () => {
      const collapse = rocketgrowthToggleAllBtn.dataset.action === 'collapse';
      toggleAllRocketgrowthCards(collapse);
    });
  }
}

/** 카드의 모든 텍스트 필드를 검색 가능한 문자열로 변환 */
function rocketgrowthCardSearchText(card) {
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
function matchesRocketgrowthQuery(card, q) {
  if (!q) return true;
  return rocketgrowthCardSearchText(card).includes(q.toLowerCase());
}

/** 전체 숨기기/펼치기 버튼 라벨 및 상태 갱신 */
function updateRocketgrowthToggleAllButton() {
  if (!rocketgrowthToggleAllBtn) return;
  const allCollapsed = rocketgrowthState.cards.length > 0 && rocketgrowthState.cards.every(c => c.isCollapsed);
  if (allCollapsed) {
    rocketgrowthToggleAllBtn.textContent = ROCKETGROWTH_CONFIG.MESSAGES.BTN_EXPAND_ALL;
    rocketgrowthToggleAllBtn.dataset.action = 'expand';
    rocketgrowthToggleAllBtn.title = '모든 카드 상세 정보 펼치기';
  } else {
    rocketgrowthToggleAllBtn.textContent = ROCKETGROWTH_CONFIG.MESSAGES.BTN_COLLAPSE_ALL;
    rocketgrowthToggleAllBtn.dataset.action = 'collapse';
    rocketgrowthToggleAllBtn.title = '모든 카드 상세 정보 숨기기';
  }
}

/** 검색 결과 수 갱신 */
function updateRocketgrowthSearchCount() {
  const countEl = document.getElementById('search-count');
  if (!countEl) return;
  const q = rocketgrowthSearchQuery.trim();
  if (!q) {
    countEl.textContent = rocketgrowthState.cards.length > 0
      ? `전체 ${rocketgrowthState.cards.length}개`
      : '';
  } else {
    const n = rocketgrowthState.cards.filter(c => matchesRocketgrowthQuery(c, q)).length;
    countEl.textContent = `${n}개 / 전체 ${rocketgrowthState.cards.length}개`;
  }
}
