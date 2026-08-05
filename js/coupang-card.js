/* =====================================================
   coupang-card.js - 쿠팡 카드 (shared-card 기반)
   수식: 표준 (판매가 기준, +마켓택배비, multiBuyProfit 있음)
   ===================================================== */

// ── 페이지별 수식 ──────────────────────────────────────

function computeCoupangFinalCost(card) {
  if (card.isBundle) {
    return round2(card.bundleItems.reduce((sum, item) => sum + parseNum(item.total), 0));
  }
  return parseNum(card.finalCost);
}

function computeCoupangFeeAmount(card) {
  return round2(parseNum(card.sellingPrice) * parseNum(card.feeRate));
}

function computeCoupangFinalProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
    - parseNum(card.warehouseFee)
    + parseNum(card.marketFee)
  );
}

function computeCoupangMultiBuyProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
  );
}

function recalcCoupangCard(card) {
  if (card.isBundle) {
    card.finalCost = computeCoupangFinalCost(card);
  }
  card.feeAmount = computeCoupangFeeAmount(card);
  card.finalProfit = computeCoupangFinalProfit(card);
  card.multiBuyProfit = computeCoupangMultiBuyProfit(card);
}

// ── 페이지별 렌더링 ────────────────────────────────────

function renderCoupangCalcRows(card) {
  const container = document.createElement('div');
  container.className = 'coupang-calc-rows';

  const row1 = document.createElement('div');
  row1.className = 'field-row three';
  row1.appendChild(makePageField(coupangCtx, 'finalCost', card.finalCost, true));
  row1.appendChild(makePageField(coupangCtx, 'sellingPrice', card.sellingPrice, !card.isEditing));
  row1.appendChild(makePageFeeField(coupangCtx, card));
  container.appendChild(row1);

  const row2 = document.createElement('div');
  row2.className = 'field-row split-profit';
  row2.appendChild(makePageField(coupangCtx, 'warehouseFee', card.warehouseFee, !card.isEditing));
  row2.appendChild(makePageField(coupangCtx, 'marketFee', card.marketFee, !card.isEditing));
  row2.appendChild(makePageField(coupangCtx, 'finalProfit', card.finalProfit, true));
  row2.appendChild(makePageField(coupangCtx, 'multiBuyProfit', card.multiBuyProfit, true));
  container.appendChild(row2);

  return container;
}

function updateCoupangCalcDisplay(wrap, card) {
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

const coupangCtx = {
  config: COUPANG_CONFIG,
  state: coupangState,
  boardEl: null,
  cardClass: '',
  calcRowsClass: 'coupang-calc-rows',
  recalc: recalcCoupangCard,
  renderCalcRows: renderCoupangCalcRows,
  updateCalcDisplay: updateCoupangCalcDisplay,
  syncFields: ['name', 'option', 'sellingPrice', 'feeRate', 'warehouseFee', 'marketFee'],
  autoFieldNames: ['feeAmount', 'finalProfit', 'finalCost', 'multiBuyProfit'],
  save: saveCoupang,
  findCard: findCoupangCard,
  addCard: addCoupangCard,
  addCardAfter: addCoupangCardAfter,
  confirmDelete: confirmDeleteCoupang,
  searchQuery: () => coupangSearchQuery,
  matchesQuery: matchesCoupangQuery,
  updateSearchCount: updateCoupangSearchCount,
  updateToggleAllButton: updateCoupangToggleAllButton,
  loadProductlistData: loadProductlistData,
  computeProductlistTotal: computeProductlistTotalGeneric,
  newBundleItem: newBundleItem,
  findBundleItem: findBundleItem,
  addBundleItem: addBundleItem,
  removeBundleItem: removeBundleItem,
};

// ── 전역 함수 ───────────────────────────────────────────

function initCoupangBoard() { return initPageBoard(coupangCtx); }
function renderCoupang() { return renderCardsPage(coupangCtx); }
function resolveCoupangCards() { return resolvePageCards(coupangCtx); }
function toggleAllCoupangCards(collapse) { return toggleAllPageCards(coupangCtx, collapse); }
