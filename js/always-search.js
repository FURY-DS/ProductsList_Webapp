/* =====================================================
   always-search.js - 올웨이즈 전체 필드 실시간 검색
   (실제 로직은 shared-search.js의 createPageSearch 사용)
   ===================================================== */

var alwaysSearch = createPageSearch({
  config: ALWAYS_CONFIG,
  state: alwaysState,
  renderFn: function () { return renderALWAYS(); },
  toggleAllFn: function (collapse) { return toggleAllALWAYSCards(collapse); }
});

// 외부(card.js 등)에서 alwaysSearchQuery 변수를 읽을 수 있도록 getter 설정
Object.defineProperty(window, 'alwaysSearchQuery', {
  get: function () { return alwaysSearch.query; },
  configurable: true
});

function initALWAYSSearch() { alwaysSearch.init(); }
function matchesALWAYSQuery(card, q) { return alwaysSearch.matchesQuery(card, q); }
function updateALWAYSToggleAllButton() { alwaysSearch.updateToggleAllButton(); }
function updateALWAYSSearchCount() { alwaysSearch.updateSearchCount(); }
