/* =====================================================
   shared-search.js - 서브페이지 공통 실시간 검색 로직
   10개 서브페이지의 search 파일에서 중복되는 검색/토글/카운트
   패턴을 통합. 각 페이지의 *-search.js는 createPageSearch()를
   호출하여 검색 관련 변수와 함수를 생성한다.
   ===================================================== */

/**
 * 페이지 전용 검색 모듈을 생성한다.
 * @param {Object}   opts
 * @param {Object}   opts.config           - 페이지 CONFIG 객체
 * @param {Object}   opts.state            - 페이지 state 객체 ({ cards: [] })
 * @param {Function} opts.renderFn         - 렌더링 함수 (예: renderSmartstore)
 * @param {Function} opts.toggleAllFn      - 전체 숨기기/펼치기 함수 (예: toggleAllSmartstoreCards)
 * @param {string[]} [opts.extraSearchFields] - 기본 검색 필드 외 추가 필드 (예: nshipping의 barcodeFee 등)
 * @returns {{ query: string, init: Function, matchesQuery: Function, cardSearchText: Function, updateToggleAllButton: Function, updateSearchCount: Function }}
 */
function createPageSearch(opts) {
  var config      = opts.config;
  var state       = opts.state;
  var renderFn    = opts.renderFn;
  var toggleAllFn = opts.toggleAllFn;
  var extraFields = opts.extraSearchFields || [];

  var query = '';
  var inputEl = null;
  var clearEl = null;
  var toggleAllBtn = null;

  // 기본 검색 대상 필드 (모든 서브페이지 공통)
  var baseFields = [
    'sellerCode', 'name', 'option',
    'finalCost', 'sellingPrice', 'feeRate', 'feeAmount',
    'warehouseFee', 'marketFee', 'finalProfit'
  ];
  var searchFields = baseFields.concat(extraFields);

  /** 검색 UI 초기화 */
  function init() {
    inputEl = document.getElementById('search-input');
    clearEl = document.getElementById('search-clear');
    toggleAllBtn = document.getElementById('btn-toggle-all');

    inputEl.placeholder = config.MESSAGES.SEARCH_PLACEHOLDER;

    inputEl.addEventListener('input', function (e) {
      query = e.target.value;
      renderFn();
    });

    clearEl.addEventListener('click', function () {
      inputEl.value = '';
      query = '';
      renderFn();
      inputEl.focus();
    });

    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', function () {
        var collapse = toggleAllBtn.dataset.action === 'collapse';
        toggleAllFn(collapse);
      });
    }
  }

  /** 카드의 모든 텍스트 필드를 검색 가능한 문자열로 변환 */
  function cardSearchText(card) {
    var parts = searchFields.map(function (f) { return card[f]; });
    if (Array.isArray(card.bundleItems)) {
      card.bundleItems.forEach(function (item) {
        parts.push(item.sellerCode, item.name, item.option, item.total);
      });
    }
    return parts.join(' ').toLowerCase();
  }

  /** 검색어와 카드 일치 여부 */
  function matchesQuery(card, q) {
    if (!q) return true;
    return cardSearchText(card).includes(q.toLowerCase());
  }

  /** 전체 숨기기/펼치기 버튼 라벨 및 상태 갱신 */
  function updateToggleAllButton() {
    if (!toggleAllBtn) return;
    var allCollapsed = state.cards.length > 0 && state.cards.every(function (c) { return c.isCollapsed; });
    if (allCollapsed) {
      toggleAllBtn.textContent = config.MESSAGES.BTN_EXPAND_ALL;
      toggleAllBtn.dataset.action = 'expand';
      toggleAllBtn.title = '모든 카드 상세 정보 펼치기';
    } else {
      toggleAllBtn.textContent = config.MESSAGES.BTN_COLLAPSE_ALL;
      toggleAllBtn.dataset.action = 'collapse';
      toggleAllBtn.title = '모든 카드 상세 정보 숨기기';
    }
  }

  /** 검색 결과 수 갱신 */
  function updateSearchCount() {
    var countEl = document.getElementById('search-count');
    if (!countEl) return;
    var q = query.trim();
    if (!q) {
      countEl.textContent = state.cards.length > 0
        ? '전체 ' + state.cards.length + '개'
        : '';
    } else {
      var n = state.cards.filter(function (c) { return matchesQuery(c, q); }).length;
      countEl.textContent = n + '개 / 전체 ' + state.cards.length + '개';
    }
  }

  return {
    init: init,
    matchesQuery: matchesQuery,
    cardSearchText: cardSearchText,
    updateToggleAllButton: updateToggleAllButton,
    updateSearchCount: updateSearchCount,
    get query() { return query; },
    set query(v) { query = v; }
  };
}
