/* =====================================================
   coupang-search.js - 쿠팡 전체 필드 실시간 검색
   (실제 로직은 shared-search.js의 createPageSearch 사용)
   ===================================================== */

var coupangSearch = createPageSearch({
  config: COUPANG_CONFIG,
  state: coupangState,
  renderFn: function () { return renderCoupang(); },
  toggleAllFn: function (collapse) { return toggleAllCoupangCards(collapse); }
});

// 외부(card.js 등)에서 coupangSearchQuery 변수를 읽을 수 있도록 getter 설정
Object.defineProperty(window, 'coupangSearchQuery', {
  get: function () { return coupangSearch.query; },
  configurable: true
});

function initCoupangSearch() { coupangSearch.init(); }
function matchesCoupangQuery(card, q) { return coupangSearch.matchesQuery(card, q); }
function updateCoupangToggleAllButton() { coupangSearch.updateToggleAllButton(); }
function updateCoupangSearchCount() { coupangSearch.updateSearchCount(); }
