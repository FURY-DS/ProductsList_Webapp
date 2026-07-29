/* =====================================================
   smartstore-search.js - 올웨이즈 전체 필드 실시간 검색
   ===================================================== */

let alwaysSearchQuery = '';
let alwaysSearchInputEl = null;
let alwaysSearchClearEl = null;
let alwaysToggleAllBtn = null;

/** 검색 UI 초기화 */
function initALWAYSSearch() {
  alwaysSearchInputEl = document.getElementById('search-input');
  alwaysSearchClearEl = document.getElementById('search-clear');
  alwaysToggleAllBtn  = document.getElementById('btn-toggle-all');

  alwaysSearchInputEl.placeholder = ALWAYS_CONFIG.MESSAGES.SEARCH_PLACEHOLDER;

  alwaysSearchInputEl.addEventListener('input', (e) => {
    alwaysSearchQuery = e.target.value;
    renderALWAYS();
  });

  alwaysSearchClearEl.addEventListener('click', () => {
    alwaysSearchInputEl.value = '';
    alwaysSearchQuery = '';
    renderALWAYS();
    alwaysSearchInputEl.focus();
  });

  if (alwaysToggleAllBtn) {
    alwaysToggleAllBtn.addEventListener('click', () => {
      const collapse = alwaysToggleAllBtn.dataset.action === 'collapse';
      toggleAllALWAYSCards(collapse);
    });
  }
}

/** 카드의 모든 텍스트 필드를 검색 가능한 문자열로 변환 */
function alwaysCardSearchText(card) {
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
function matchesALWAYSQuery(card, q) {
  if (!q) return true;
  return alwaysCardSearchText(card).includes(q.toLowerCase());
}

/** 전체 숨기기/펼치기 버튼 라벨 및 상태 갱신 */
function updateALWAYSToggleAllButton() {
  if (!alwaysToggleAllBtn) return;
  const allCollapsed = alwaysState.cards.length > 0 && alwaysState.cards.every(c => c.isCollapsed);
  if (allCollapsed) {
    alwaysToggleAllBtn.textContent = ALWAYS_CONFIG.MESSAGES.BTN_EXPAND_ALL;
    alwaysToggleAllBtn.dataset.action = 'expand';
    alwaysToggleAllBtn.title = '모든 카드 상세 정보 펼치기';
  } else {
    alwaysToggleAllBtn.textContent = ALWAYS_CONFIG.MESSAGES.BTN_COLLAPSE_ALL;
    alwaysToggleAllBtn.dataset.action = 'collapse';
    alwaysToggleAllBtn.title = '모든 카드 상세 정보 숨기기';
  }
}

/** 검색 결과 수 갱신 */
function updateALWAYSSearchCount() {
  const countEl = document.getElementById('search-count');
  if (!countEl) return;
  const q = alwaysSearchQuery.trim();
  if (!q) {
    countEl.textContent = alwaysState.cards.length > 0
      ? `전체 ${alwaysState.cards.length}개`
      : '';
  } else {
    const n = alwaysState.cards.filter(c => matchesALWAYSQuery(c, q)).length;
    countEl.textContent = `${n}개 / 전체 ${alwaysState.cards.length}개`;
  }
}
