/* =====================================================
   esm-search.js - ESM 전체 필드 실시간 검색
   (실제 로직은 shared-search.js의 createPageSearch 사용)
   ===================================================== */

var esmSearch = createPageSearch({
  config: ESM_CONFIG,
  state: esmState,
  renderFn: function () { return renderEsm(); },
  toggleAllFn: function (collapse) { return toggleAllEsmCards(collapse); }
});

// 외부(card.js 등)에서 esmSearchQuery 변수를 읽을 수 있도록 getter 설정
Object.defineProperty(window, 'esmSearchQuery', {
  get: function () { return esmSearch.query; },
  configurable: true
});

function initEsmSearch() { esmSearch.init(); }
function matchesEsmQuery(card, q) { return esmSearch.matchesQuery(card, q); }
function updateEsmToggleAllButton() { esmSearch.updateToggleAllButton(); }
function updateEsmSearchCount() { esmSearch.updateSearchCount(); }
