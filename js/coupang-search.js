/* =====================================================
   coupang-search.js - 쿠팡 전체 필드 실시간 검색
   ===================================================== */

let coupangSearchQuery = '';
let coupangSearchInputEl = null;
let coupangSearchClearEl = null;
let coupangToggleAllBtn = null;

/** 검색 UI 초기화 */
function initCoupangSearch() {
  coupangSearchInputEl = document.getElementById('search-input');
  coupangSearchClearEl = document.getElementById('search-clear');
  coupangToggleAllBtn  = document.getElementById('btn-toggle-all');

  coupangSearchInputEl.placeholder = COUPANG_CONFIG.MESSAGES.SEARCH_PLACEHOLDER;

  coupangSearchInputEl.addEventListener('input', (e) => {
    coupangSearchQuery = e.target.value;
    renderCoupang();
  });

  coupangSearchClearEl.addEventListener('click', () => {
    coupangSearchInputEl.value = '';
    coupangSearchQuery = '';
    renderCoupang();
    coupangSearchInputEl.focus();
  });

  if (coupangToggleAllBtn) {
    coupangToggleAllBtn.addEventListener('click', () => {
      const collapse = coupangToggleAllBtn.dataset.action === 'collapse';
      toggleAllCoupangCards(collapse);
    });
  }
}

/** 카드의 모든 텍스트 필드를 검색 가능한 문자열로 변환 */
function coupangCardSearchText(card) {
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
function matchesCoupangQuery(card, q) {
  if (!q) return true;
  return coupangCardSearchText(card).includes(q.toLowerCase());
}

/** 전체 숨기기/펼치기 버튼 라벨 및 상태 갱신 */
function updateCoupangToggleAllButton() {
  if (!coupangToggleAllBtn) return;
  const allCollapsed = coupangState.cards.length > 0 && coupangState.cards.every(c => c.isCollapsed);
  if (allCollapsed) {
    coupangToggleAllBtn.textContent = COUPANG_CONFIG.MESSAGES.BTN_EXPAND_ALL;
    coupangToggleAllBtn.dataset.action = 'expand';
    coupangToggleAllBtn.title = '모든 카드 상세 정보 펼치기';
  } else {
    coupangToggleAllBtn.textContent = COUPANG_CONFIG.MESSAGES.BTN_COLLAPSE_ALL;
    coupangToggleAllBtn.dataset.action = 'collapse';
    coupangToggleAllBtn.title = '모든 카드 상세 정보 숨기기';
  }
}

/** 검색 결과 수 갱신 */
function updateCoupangSearchCount() {
  const countEl = document.getElementById('search-count');
  if (!countEl) return;
  const q = coupangSearchQuery.trim();
  if (!q) {
    countEl.textContent = coupangState.cards.length > 0
      ? `전체 ${coupangState.cards.length}개`
      : '';
  } else {
    const n = coupangState.cards.filter(c => matchesCoupangQuery(c, q)).length;
    countEl.textContent = `${n}개 / 전체 ${coupangState.cards.length}개`;
  }
}
