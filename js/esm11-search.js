/* =====================================================
   esm11-search.js - ESM/11번가 전체 필드 실시간 검색
   ===================================================== */

let esm11SearchQuery = '';
let esm11SearchInputEl = null;
let esm11SearchClearEl = null;
let esm11ToggleAllBtn = null;

/** 검색 UI 초기화 */
function initEsm11Search() {
  esm11SearchInputEl = document.getElementById('search-input');
  esm11SearchClearEl = document.getElementById('search-clear');
  esm11ToggleAllBtn  = document.getElementById('btn-toggle-all');

  esm11SearchInputEl.placeholder = ESM11_CONFIG.MESSAGES.SEARCH_PLACEHOLDER;

  esm11SearchInputEl.addEventListener('input', (e) => {
    esm11SearchQuery = e.target.value;
    renderEsm11();
  });

  esm11SearchClearEl.addEventListener('click', () => {
    esm11SearchInputEl.value = '';
    esm11SearchQuery = '';
    renderEsm11();
    esm11SearchInputEl.focus();
  });

  if (esm11ToggleAllBtn) {
    esm11ToggleAllBtn.addEventListener('click', () => {
      const collapse = esm11ToggleAllBtn.dataset.action === 'collapse';
      toggleAllEsm11Cards(collapse);
    });
  }
}

/** 카드의 모든 텍스트 필드를 검색 가능한 문자열로 변환 */
function esm11CardSearchText(card) {
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
function matchesEsm11Query(card, q) {
  if (!q) return true;
  return esm11CardSearchText(card).includes(q.toLowerCase());
}

/** 전체 숨기기/펼치기 버튼 라벨 및 상태 갱신 */
function updateEsm11ToggleAllButton() {
  if (!esm11ToggleAllBtn) return;
  const allCollapsed = esm11State.cards.length > 0 && esm11State.cards.every(c => c.isCollapsed);
  if (allCollapsed) {
    esm11ToggleAllBtn.textContent = ESM11_CONFIG.MESSAGES.BTN_EXPAND_ALL;
    esm11ToggleAllBtn.dataset.action = 'expand';
    esm11ToggleAllBtn.title = '모든 카드 상세 정보 펼치기';
  } else {
    esm11ToggleAllBtn.textContent = ESM11_CONFIG.MESSAGES.BTN_COLLAPSE_ALL;
    esm11ToggleAllBtn.dataset.action = 'collapse';
    esm11ToggleAllBtn.title = '모든 카드 상세 정보 숨기기';
  }
}

/** 검색 결과 수 갱신 */
function updateEsm11SearchCount() {
  const countEl = document.getElementById('search-count');
  if (!countEl) return;
  const q = esm11SearchQuery.trim();
  if (!q) {
    countEl.textContent = esm11State.cards.length > 0
      ? `전체 ${esm11State.cards.length}개`
      : '';
  } else {
    const n = esm11State.cards.filter(c => matchesEsm11Query(c, q)).length;
    countEl.textContent = `${n}개 / 전체 ${esm11State.cards.length}개`;
  }
}
