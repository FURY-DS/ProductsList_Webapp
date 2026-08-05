/* =====================================================
   domagguk-search.js - 도매꾹 전체 필드 실시간 검색
   (실제 로직은 shared-search.js의 createPageSearch 사용)
   ===================================================== */

var domaggukSearch = createPageSearch({
  config: DOMAGGUK_CONFIG,
  state: domaggukState,
  renderFn: function () { return renderDOMAGGUK(); },
  toggleAllFn: function (collapse) { return toggleAllDOMAGGUKCards(collapse); }
});

// 외부(card.js 등)에서 domaggukSearchQuery 변수를 읽을 수 있도록 getter 설정
Object.defineProperty(window, 'domaggukSearchQuery', {
  get: function () { return domaggukSearch.query; },
  configurable: true
});

function initDOMAGGUKSearch() { domaggukSearch.init(); }
function matchesDOMAGGUKQuery(card, q) { return domaggukSearch.matchesQuery(card, q); }
function updateDOMAGGUKToggleAllButton() { domaggukSearch.updateToggleAllButton(); }
function updateDOMAGGUKSearchCount() { domaggukSearch.updateSearchCount(); }
