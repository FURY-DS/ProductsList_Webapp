/* =====================================================
   nshipping-search.js - N배송 전체 필드 실시간 검색
   (실제 로직은 shared-search.js의 createPageSearch 사용)
   N배송은 barcodeFee, pickingFee, tagFee 추가 필드 검색 지원
   ===================================================== */

var nshippingSearch = createPageSearch({
  config: NSHIPPING_CONFIG,
  state: nshippingState,
  renderFn: function () { return renderNshipping(); },
  toggleAllFn: function (collapse) { return toggleAllNshippingCards(collapse); },
  extraSearchFields: ['barcodeFee', 'pickingFee', 'tagFee']
});

// 외부(card.js 등)에서 nshippingSearchQuery 변수를 읽을 수 있도록 getter 설정
Object.defineProperty(window, 'nshippingSearchQuery', {
  get: function () { return nshippingSearch.query; },
  configurable: true
});

function initNshippingSearch() { nshippingSearch.init(); }
function matchesNshippingQuery(card, q) { return nshippingSearch.matchesQuery(card, q); }
function updateNshippingToggleAllButton() { nshippingSearch.updateToggleAllButton(); }
function updateNshippingSearchCount() { nshippingSearch.updateSearchCount(); }
