/* =====================================================
   rocketgrowth-search.js - 로켓그로스 전체 필드 실시간 검색
   (실제 로직은 shared-search.js의 createPageSearch 사용)
   ===================================================== */

var rocketgrowthSearch = createPageSearch({
  config: ROCKETGROWTH_CONFIG,
  state: rocketgrowthState,
  renderFn: function () { return renderRocketgrowth(); },
  toggleAllFn: function (collapse) { return toggleAllRocketgrowthCards(collapse); }
});

// 외부(card.js 등)에서 rocketgrowthSearchQuery 변수를 읽을 수 있도록 getter 설정
Object.defineProperty(window, 'rocketgrowthSearchQuery', {
  get: function () { return rocketgrowthSearch.query; },
  configurable: true
});

function initRocketgrowthSearch() { rocketgrowthSearch.init(); }
function matchesRocketgrowthQuery(card, q) { return rocketgrowthSearch.matchesQuery(card, q); }
function updateRocketgrowthToggleAllButton() { rocketgrowthSearch.updateToggleAllButton(); }
function updateRocketgrowthSearchCount() { rocketgrowthSearch.updateSearchCount(); }
