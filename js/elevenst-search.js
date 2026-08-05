/* =====================================================
   elevenst-search.js - 11번가 전체 필드 실시간 검색
   (실제 로직은 shared-search.js의 createPageSearch 사용)
   ===================================================== */

var elevenstSearch = createPageSearch({
  config: ELEVENST_CONFIG,
  state: elevenstState,
  renderFn: function () { return renderElevenst(); },
  toggleAllFn: function (collapse) { return toggleAllElevenstCards(collapse); }
});

// 외부(card.js 등)에서 elevenstSearchQuery 변수를 읽을 수 있도록 getter 설정
Object.defineProperty(window, 'elevenstSearchQuery', {
  get: function () { return elevenstSearch.query; },
  configurable: true
});

function initElevenstSearch() { elevenstSearch.init(); }
function matchesElevenstQuery(card, q) { return elevenstSearch.matchesQuery(card, q); }
function updateElevenstToggleAllButton() { elevenstSearch.updateToggleAllButton(); }
function updateElevenstSearchCount() { elevenstSearch.updateSearchCount(); }
