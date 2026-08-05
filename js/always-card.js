/* =====================================================
   always-card.js - 올웨이즈 카드 (shared-card 기반)
   수식: 표준 (판매가 기준, +마켓택배비, multiBuyProfit 있음)
   ===================================================== */

// ── 페이지별 수식 ──────────────────────────────────────

/** 최종원가 계산 */
function computeALWAYSFinalCost(card) {
  if (card.isBundle) {
    return round2(card.bundleItems.reduce((sum, item) => sum + parseNum(item.total), 0));
  }
  return parseNum(card.finalCost);
}

/** 판매수수료 금액 */
function computeALWAYSFeeAmount(card) {
  return round2(parseNum(card.sellingPrice) * parseNum(card.feeRate));
}

/** 최종이익: 판매가 - 최종원가 - 수수료 - 창고택배비 + 마켓택배비 */
function computeALWAYSFinalProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
    - parseNum(card.warehouseFee)
    + parseNum(card.marketFee)
  );
}

/** 2개이상구매 이익: 판매가 - 최종원가 - 수수료 */
function computeALWAYSMultiBuyProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
  );
}

/** 카드 계산 필드 갱신 */
function recalcALWAYSCard(card) {
  if (card.isBundle) {
    card.finalCost = computeALWAYSFinalCost(card);
  }
  card.feeAmount = computeALWAYSFeeAmount(card);
  card.finalProfit = computeALWAYSFinalProfit(card);
  card.multiBuyProfit = computeALWAYSMultiBuyProfit(card);
}

// ── 페이지별 렌더링 ────────────────────────────────────

/** 계산 필드 rows */
function renderALWAYSCalcRows(card) {
  const container = document.createElement('div');
  container.className = 'smartstore-calc-rows';

  const row1 = document.createElement('div');
  row1.className = 'field-row three';
  row1.appendChild(makePageField(alwaysCtx, 'finalCost', card.finalCost, true));
  row1.appendChild(makePageField(alwaysCtx, 'sellingPrice', card.sellingPrice, !card.isEditing));
  row1.appendChild(makePageFeeField(alwaysCtx, card));
  container.appendChild(row1);

  const row2 = document.createElement('div');
  row2.className = 'field-row split-profit';
  row2.appendChild(makePageField(alwaysCtx, 'warehouseFee', card.warehouseFee, !card.isEditing));
  row2.appendChild(makePageField(alwaysCtx, 'marketFee', card.marketFee, !card.isEditing));
  row2.appendChild(makePageField(alwaysCtx, 'finalProfit', card.finalProfit, true));
  row2.appendChild(makePageField(alwaysCtx, 'multiBuyProfit', card.multiBuyProfit, true));
  container.appendChild(row2);

  return container;
}

/** 화면에서 계산 필드만 갱신 */
function updateALWAYSCalcDisplay(wrap, card) {
  const finalCostEl = wrap.querySelector('input[name="finalCost"]');
  const feeAmountEl = wrap.querySelector('input[name="feeAmount"]');
  const finalProfitEl = wrap.querySelector('input[name="finalProfit"]');
  const multiBuyProfitEl = wrap.querySelector('input[name="multiBuyProfit"]');
  if (finalCostEl) finalCostEl.value = formatNumber(parseNum(card.finalCost));
  if (feeAmountEl) feeAmountEl.value = formatNumber(parseNum(card.feeAmount));
  if (finalProfitEl) finalProfitEl.value = formatNumber(parseNum(card.finalProfit));
  if (multiBuyProfitEl) multiBuyProfitEl.value = formatNumber(parseNum(card.multiBuyProfit));
}

// ── 컨텍스트 ───────────────────────────────────────────

const alwaysCtx = {
  config: ALWAYS_CONFIG,
  state: alwaysState,
  boardEl: null,
  cardClass: 'always-card',
  calcRowsClass: 'smartstore-calc-rows',
  recalc: recalcALWAYSCard,
  renderCalcRows: renderALWAYSCalcRows,
  updateCalcDisplay: updateALWAYSCalcDisplay,
  syncFields: ['name', 'option', 'sellingPrice', 'feeRate', 'warehouseFee', 'marketFee'],
  autoFieldNames: ['feeAmount', 'finalProfit', 'finalCost', 'multiBuyProfit'],
  save: saveALWAYS,
  findCard: findALWAYSCard,
  addCard: addALWAYSCard,
  addCardAfter: addALWAYSCardAfter,
  confirmDelete: confirmDeleteALWAYS,
  searchQuery: () => alwaysSearchQuery,
  matchesQuery: matchesALWAYSQuery,
  updateSearchCount: updateALWAYSSearchCount,
  updateToggleAllButton: updateALWAYSToggleAllButton,
  loadProductlistData: loadProductlistDataALWAYS,
  computeProductlistTotal: computeProductlistTotalALWAYS,
  newBundleItem: newBundleItem,
  findBundleItem: findBundleItem,
  addBundleItem: addBundleItem,
  removeBundleItem: removeBundleItem,
};

// ── 전역 함수 (외부 호출용) ─────────────────────────────

function initALWAYSBoard() { return initPageBoard(alwaysCtx); }
function renderALWAYS() { return renderCardsPage(alwaysCtx); }
function resolveALWAYSCards() { return resolvePageCards(alwaysCtx); }
function toggleAllALWAYSCards(collapse) { return toggleAllPageCards(alwaysCtx, collapse); }
