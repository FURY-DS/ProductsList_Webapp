/* =====================================================
   esm-card.js - ESM 카드 (shared-card 기반)
   수식: 표준 (판매가 기준, +마켓택배비, multiBuyProfit 있음)
   ===================================================== */

// ── 페이지별 수식 ──────────────────────────────────────

function computeEsmFinalCost(card) {
  if (card.isBundle) {
    return round2(card.bundleItems.reduce((sum, item) => sum + parseNum(item.total), 0));
  }
  return parseNum(card.finalCost);
}

function computeEsmFeeAmount(card) {
  return round2(parseNum(card.sellingPrice) * parseNum(card.feeRate));
}

function computeEsmFinalProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
    - parseNum(card.warehouseFee)
    + parseNum(card.marketFee)
  );
}

function computeEsmMultiBuyProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
  );
}

function recalcEsmCard(card) {
  if (card.isBundle) {
    card.finalCost = computeEsmFinalCost(card);
  }
  card.feeAmount = computeEsmFeeAmount(card);
  card.finalProfit = computeEsmFinalProfit(card);
  card.multiBuyProfit = computeEsmMultiBuyProfit(card);
}

// ── 페이지별 렌더링 ────────────────────────────────────

function renderEsmCalcRows(card) {
  const container = document.createElement('div');
  container.className = 'smartstore-calc-rows';

  const row1 = document.createElement('div');
  row1.className = 'field-row three';
  row1.appendChild(makePageField(esmCtx, 'finalCost', card.finalCost, true));
  row1.appendChild(makePageField(esmCtx, 'sellingPrice', card.sellingPrice, !card.isEditing));
  row1.appendChild(makePageFeeField(esmCtx, card));
  container.appendChild(row1);

  const row2 = document.createElement('div');
  row2.className = 'field-row split-profit';
  row2.appendChild(makePageField(esmCtx, 'warehouseFee', card.warehouseFee, !card.isEditing));
  row2.appendChild(makePageField(esmCtx, 'marketFee', card.marketFee, !card.isEditing));
  row2.appendChild(makePageField(esmCtx, 'finalProfit', card.finalProfit, true));
  row2.appendChild(makePageField(esmCtx, 'multiBuyProfit', card.multiBuyProfit, true));
  container.appendChild(row2);

  return container;
}

function updateEsmCalcDisplay(wrap, card) {
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

const esmCtx = {
  config: ESM_CONFIG,
  state: esmState,
  boardEl: null,
  calcRowsClass: 'smartstore-calc-rows',
  recalc: recalcEsmCard,
  renderCalcRows: renderEsmCalcRows,
  updateCalcDisplay: updateEsmCalcDisplay,
  syncFields: ['name', 'option', 'sellingPrice', 'feeRate', 'warehouseFee', 'marketFee'],
  autoFieldNames: ['feeAmount', 'finalProfit', 'finalCost', 'multiBuyProfit'],
  save: saveEsm,
  findCard: findEsmCard,
  addCard: addEsmCard,
  addCardAfter: addEsmCardAfter,
  confirmDelete: confirmDeleteEsm,
  searchQuery: () => esmSearchQuery,
  matchesQuery: matchesEsmQuery,
  updateSearchCount: updateEsmSearchCount,
  updateToggleAllButton: updateEsmToggleAllButton,
  loadProductlistData: loadProductlistData,
  computeProductlistTotal: computeProductlistTotalGeneric,
  newBundleItem: newBundleItem,
  findBundleItem: findBundleItem,
  addBundleItem: addBundleItem,
  removeBundleItem: removeBundleItem,
};

// ── 전역 함수 ───────────────────────────────────────────

function initEsmBoard() { return initPageBoard(esmCtx); }
function renderEsm() { return renderCardsPage(esmCtx); }
function resolveEsmCards() { return resolvePageCards(esmCtx); }
function toggleAllEsmCards(collapse) { return toggleAllPageCards(esmCtx, collapse); }
