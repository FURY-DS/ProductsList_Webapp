/* =====================================================
   domagguk-card.js - 도매꾹 카드 (shared-card 기반)
   수식: 표준 (판매가 기준, +마켓택배비, multiBuyProfit 있음)
   ===================================================== */

// ── 페이지별 수식 ──────────────────────────────────────

function computeDOMAGGUKFinalCost(card) {
  if (card.isBundle) {
    return round2(card.bundleItems.reduce((sum, item) => sum + parseNum(item.total), 0));
  }
  return parseNum(card.finalCost);
}

function computeDOMAGGUKFeeAmount(card) {
  return round2(parseNum(card.sellingPrice) * parseNum(card.feeRate));
}

function computeDOMAGGUKFinalProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
    - parseNum(card.warehouseFee)
    + parseNum(card.marketFee)
  );
}

function computeDOMAGGUKMultiBuyProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
  );
}

function recalcDOMAGGUKCard(card) {
  if (card.isBundle) {
    card.finalCost = computeDOMAGGUKFinalCost(card);
  }
  card.feeAmount = computeDOMAGGUKFeeAmount(card);
  card.finalProfit = computeDOMAGGUKFinalProfit(card);
  card.multiBuyProfit = computeDOMAGGUKMultiBuyProfit(card);
}

// ── 페이지별 렌더링 ────────────────────────────────────

function renderDOMAGGUKCalcRows(card) {
  const container = document.createElement('div');
  container.className = 'smartstore-calc-rows';

  const row1 = document.createElement('div');
  row1.className = 'field-row three';
  row1.appendChild(makePageField(domaggukCtx, 'finalCost', card.finalCost, true));
  row1.appendChild(makePageField(domaggukCtx, 'sellingPrice', card.sellingPrice, !card.isEditing));
  row1.appendChild(makePageFeeField(domaggukCtx, card));
  container.appendChild(row1);

  const row2 = document.createElement('div');
  row2.className = 'field-row split-profit';
  row2.appendChild(makePageField(domaggukCtx, 'warehouseFee', card.warehouseFee, !card.isEditing));
  row2.appendChild(makePageField(domaggukCtx, 'marketFee', card.marketFee, !card.isEditing));
  row2.appendChild(makePageField(domaggukCtx, 'finalProfit', card.finalProfit, true));
  row2.appendChild(makePageField(domaggukCtx, 'multiBuyProfit', card.multiBuyProfit, true));
  container.appendChild(row2);

  return container;
}

function updateDOMAGGUKCalcDisplay(wrap, card) {
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

const domaggukCtx = {
  config: DOMAGGUK_CONFIG,
  state: domaggukState,
  boardEl: null,
  cardClass: '',
  calcRowsClass: 'smartstore-calc-rows',
  recalc: recalcDOMAGGUKCard,
  renderCalcRows: renderDOMAGGUKCalcRows,
  updateCalcDisplay: updateDOMAGGUKCalcDisplay,
  syncFields: ['name', 'option', 'sellingPrice', 'feeRate', 'warehouseFee', 'marketFee'],
  autoFieldNames: ['feeAmount', 'finalProfit', 'finalCost', 'multiBuyProfit'],
  save: saveDOMAGGUK,
  findCard: findDOMAGGUKCard,
  addCard: addDOMAGGUKCard,
  addCardAfter: addDOMAGGUKCardAfter,
  confirmDelete: confirmDeleteDOMAGGUK,
  searchQuery: () => domaggukSearchQuery,
  matchesQuery: matchesDOMAGGUKQuery,
  updateSearchCount: updateDOMAGGUKSearchCount,
  updateToggleAllButton: updateDOMAGGUKToggleAllButton,
  loadProductlistData: loadProductlistDataDOMAGGUK,
  computeProductlistTotal: computeProductlistTotalGeneric,
  newBundleItem: newBundleItem,
  findBundleItem: findBundleItem,
  addBundleItem: addBundleItem,
  removeBundleItem: removeBundleItem,
};

// ── 전역 함수 ───────────────────────────────────────────

function initDOMAGGUKBoard() { return initPageBoard(domaggukCtx); }
function renderDOMAGGUK() { return renderCardsPage(domaggukCtx); }
function resolveDOMAGGUKCards() { return resolvePageCards(domaggukCtx); }
function toggleAllDOMAGGUKCards(collapse) { return toggleAllPageCards(domaggukCtx, collapse); }
