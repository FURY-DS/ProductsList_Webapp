/* =====================================================
   tossshopping-search.js - 토스쇼핑 전체 필드 실시간 검색
   (실제 로직은 shared-search.js의 createPageSearch 사용)
   ===================================================== */

var tossshoppingSearch = createPageSearch({
  config: TOSSSHOPPING_CONFIG,
  state: tossshoppingState,
  renderFn: function () { return renderTOSSSHOPPING(); },
  toggleAllFn: function (collapse) { return toggleAllTOSSSHOPPINGCards(collapse); }
});

// 외부(card.js 등)에서 tossshoppingSearchQuery 변수를 읽을 수 있도록 getter 설정
Object.defineProperty(window, 'tossshoppingSearchQuery', {
  get: function () { return tossshoppingSearch.query; },
  configurable: true
});

function initTOSSSHOPPINGSearch() { tossshoppingSearch.init(); }
function matchesTOSSSHOPPINGQuery(card, q) { return tossshoppingSearch.matchesQuery(card, q); }
function updateTOSSSHOPPINGToggleAllButton() { tossshoppingSearch.updateToggleAllButton(); }
function updateTOSSSHOPPINGSearchCount() { tossshoppingSearch.updateSearchCount(); }
