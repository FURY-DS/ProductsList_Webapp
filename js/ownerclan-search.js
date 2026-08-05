/* =====================================================
   ownerclan-search.js - 오너클랜 전체 필드 실시간 검색
   (실제 로직은 shared-search.js의 createPageSearch 사용)
   ===================================================== */

var ownerclanSearch = createPageSearch({
  config: OWNERCLAN_CONFIG,
  state: ownerclanState,
  renderFn: function () { return renderOWNERCLAN(); },
  toggleAllFn: function (collapse) { return toggleAllOWNERCLANCards(collapse); }
});

// 외부(card.js 등)에서 ownerclanSearchQuery 변수를 읽을 수 있도록 getter 설정
Object.defineProperty(window, 'ownerclanSearchQuery', {
  get: function () { return ownerclanSearch.query; },
  configurable: true
});

function initOWNERCLANSearch() { ownerclanSearch.init(); }
function matchesOWNERCLANQuery(card, q) { return ownerclanSearch.matchesQuery(card, q); }
function updateOWNERCLANToggleAllButton() { ownerclanSearch.updateToggleAllButton(); }
function updateOWNERCLANSearchCount() { ownerclanSearch.updateSearchCount(); }
