/* =====================================================
   elevenst-search.js - 11번가 전체 필드 실시간 검색
   ===================================================== */

let elevenstSearchQuery = '';
let elevenstSearchInputEl = null;
let elevenstSearchClearEl = null;
let elevenstToggleAllBtn = null;

/** 검색 UI 초기화 */
function initElevenstSearch() {
  elevenstSearchInputEl = document.getElementById('search-input');
  elevenstSearchClearEl = document.getElementById('search-clear');
  elevenstToggleAllBtn  = document.getElementById('btn-toggle-all');

  elevenstSearchInputEl.placeholder = ELEVENST_CONFIG.MESSAGES.SEARCH_PLACEHOLDER;

  elevenstSearchInputEl.addEventListener('input', (e) => {
    elevenstSearchQuery = e.target.value;
    renderElevenst();
  });

  elevenstSearchClearEl.addEventListener('click', () => {
    elevenstSearchInputEl.value = '';
    elevenstSearchQuery = '';
    renderElevenst();
    elevenstSearchInputEl.focus();
  });

  if (elevenstToggleAllBtn) {
    elevenstToggleAllBtn.addEventListener('click', () => {
      const collapse = elevenstToggleAllBtn.dataset.action === 'collapse';
      toggleAllElevenstCards(collapse);
    });
  }
}

/** 카드의 모든 텍스트 필드를 검색 가능한 문자열로 변환 */
function elevenstCardSearchText(card) {
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
function matchesElevenstQuery(card, q) {
  if (!q) return true;
  return elevenstCardSearchText(card).includes(q.toLowerCase());
}

/** 전체 숨기기/펼치기 버튼 라벨 및 상태 갱신 */
function updateElevenstToggleAllButton() {
  if (!elevenstToggleAllBtn) return;
  const allCollapsed = elevenstState.cards.length > 0 && elevenstState.cards.every(c => c.isCollapsed);
  if (allCollapsed) {
    elevenstToggleAllBtn.textContent = ELEVENST_CONFIG.MESSAGES.BTN_EXPAND_ALL;
    elevenstToggleAllBtn.dataset.action = 'expand';
    elevenstToggleAllBtn.title = '모든 카드 상세 정보 펼치기';
  } else {
    elevenstToggleAllBtn.textContent = ELEVENST_CONFIG.MESSAGES.BTN_COLLAPSE_ALL;
    elevenstToggleAllBtn.dataset.action = 'collapse';
    elevenstToggleAllBtn.title = '모든 카드 상세 정보 숨기기';
  }
}

/** 검색 결과 수 갱신 */
function updateElevenstSearchCount() {
  const countEl = document.getElementById('search-count');
  if (!countEl) return;
  const q = elevenstSearchQuery.trim();
  if (!q) {
    countEl.textContent = elevenstState.cards.length > 0
      ? `전체 ${elevenstState.cards.length}개`
      : '';
  } else {
    const n = elevenstState.cards.filter(c => matchesElevenstQuery(c, q)).length;
    countEl.textContent = `${n}개 / 전체 ${elevenstState.cards.length}개`;
  }
}
