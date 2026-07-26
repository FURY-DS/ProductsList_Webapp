/* =====================================================
   esm-search.js - ESM 전체 필드 실시간 검색
   ===================================================== */

let esmSearchQuery = '';
let esmSearchInputEl = null;
let esmSearchClearEl = null;
let esmToggleAllBtn = null;

/** 검색 UI 초기화 */
function initEsmSearch() {
  esmSearchInputEl = document.getElementById('search-input');
  esmSearchClearEl = document.getElementById('search-clear');
  esmToggleAllBtn  = document.getElementById('btn-toggle-all');

  esmSearchInputEl.placeholder = ESM_CONFIG.MESSAGES.SEARCH_PLACEHOLDER;

  esmSearchInputEl.addEventListener('input', (e) => {
    esmSearchQuery = e.target.value;
    renderEsm();
  });

  esmSearchClearEl.addEventListener('click', () => {
    esmSearchInputEl.value = '';
    esmSearchQuery = '';
    renderEsm();
    esmSearchInputEl.focus();
  });

  if (esmToggleAllBtn) {
    esmToggleAllBtn.addEventListener('click', () => {
      const collapse = esmToggleAllBtn.dataset.action === 'collapse';
      toggleAllEsmCards(collapse);
    });
  }
}

/** 카드의 모든 텍스트 필드를 검색 가능한 문자열로 변환 */
function esmCardSearchText(card) {
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
function matchesEsmQuery(card, q) {
  if (!q) return true;
  return esmCardSearchText(card).includes(q.toLowerCase());
}

/** 전체 숨기기/펼치기 버튼 라벨 및 상태 갱신 */
function updateEsmToggleAllButton() {
  if (!esmToggleAllBtn) return;
  const allCollapsed = esmState.cards.length > 0 && esmState.cards.every(c => c.isCollapsed);
  if (allCollapsed) {
    esmToggleAllBtn.textContent = ESM_CONFIG.MESSAGES.BTN_EXPAND_ALL;
    esmToggleAllBtn.dataset.action = 'expand';
    esmToggleAllBtn.title = '모든 카드 상세 정보 펼치기';
  } else {
    esmToggleAllBtn.textContent = ESM_CONFIG.MESSAGES.BTN_COLLAPSE_ALL;
    esmToggleAllBtn.dataset.action = 'collapse';
    esmToggleAllBtn.title = '모든 카드 상세 정보 숨기기';
  }
}

/** 검색 결과 수 갱신 */
function updateEsmSearchCount() {
  const countEl = document.getElementById('search-count');
  if (!countEl) return;
  const q = esmSearchQuery.trim();
  if (!q) {
    countEl.textContent = esmState.cards.length > 0
      ? `전체 ${esmState.cards.length}개`
      : '';
  } else {
    const n = esmState.cards.filter(c => matchesEsmQuery(c, q)).length;
    countEl.textContent = `${n}개 / 전체 ${esmState.cards.length}개`;
  }
}
