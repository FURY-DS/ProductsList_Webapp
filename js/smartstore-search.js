/* =====================================================
   smartstore-search.js - 스마트스토어 전체 필드 실시간 검색
   (실제 로직은 shared-search.js의 createPageSearch 사용)
   ===================================================== */

var smartstoreSearch = createPageSearch({
  config: SMARTSTORE_CONFIG,
  state: smartstoreState,
  renderFn: function () { return renderSmartstore(); },
  toggleAllFn: function (collapse) { return toggleAllSmartstoreCards(collapse); }
});

// 외부(card.js 등)에서 smartstoreSearchQuery 변수를 읽을 수 있도록 getter 설정
Object.defineProperty(window, 'smartstoreSearchQuery', {
  get: function () { return smartstoreSearch.query; },
  configurable: true
});

function initSmartstoreSearch() { smartstoreSearch.init(); }
function matchesSmartstoreQuery(card, q) { return smartstoreSearch.matchesQuery(card, q); }
function updateSmartstoreToggleAllButton() { smartstoreSearch.updateToggleAllButton(); }
function updateSmartstoreSearchCount() { smartstoreSearch.updateSearchCount(); }
