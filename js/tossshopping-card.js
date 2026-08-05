/* =====================================================
   tossshopping-card.js - 토스쇼핑 카드 (shared-card 기반)
   수식: 표준 (판매가 기준, +마켓택배비, multiBuyProfit 있음)
   ===================================================== */

// ── 페이지별 수식 ──────────────────────────────────────

function computeTOSSSHOPPINGFinalCost(card) {
  if (card.isBundle) {
    return round2(card.bundleItems.reduce((sum, item) => sum + parseNum(item.total), 0));
  }
  return parseNum(card.finalCost);
}

function computeTOSSSHOPPINGFeeAmount(card) {
  return round2(parseNum(card.sellingPrice) * parseNum(card.feeRate));
}

function computeTOSSSHOPPINGFinalProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
    - parseNum(card.warehouseFee)
    + parseNum(card.marketFee)
  );
}

function computeTOSSSHOPPINGMultiBuyProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
  );
}

function recalcTOSSSHOPPINGCard(card) {
  if (card.isBundle) {
    card.finalCost = computeTOSSSHOPPINGFinalCost(card);
  }
  card.feeAmount = computeTOSSSHOPPINGFeeAmount(card);
  card.finalProfit = computeTOSSSHOPPINGFinalProfit(card);
  card.multiBuyProfit = computeTOSSSHOPPINGMultiBuyProfit(card);
}

// ── 페이지별 렌더링 ────────────────────────────────────

function renderTOSSSHOPPINGCalcRows(card) {
  const container = document.createElement('div');
  container.className = 'smartstore-calc-rows';

  const row1 = document.createElement('div');
  row1.className = 'field-row three';
  row1.appendChild(makePageField(tossshoppingCtx, 'finalCost', card.finalCost, true));
  row1.appendChild(makePageField(tossshoppingCtx, 'sellingPrice', card.sellingPrice, !card.isEditing));
  row1.appendChild(makePageFeeField(tossshoppingCtx, card));
  container.appendChild(row1);

  const row2 = document.createElement('div');
  row2.className = 'field-row split-profit';
  row2.appendChild(makePageField(tossshoppingCtx, 'warehouseFee', card.warehouseFee, !card.isEditing));
  row2.appendChild(makePageField(tossshoppingCtx, 'marketFee', card.marketFee, !card.isEditing));
  row2.appendChild(makePageField(tossshoppingCtx, 'finalProfit', card.finalProfit, true));
  row2.appendChild(makePageField(tossshoppingCtx, 'multiBuyProfit', card.multiBuyProfit, true));
  container.appendChild(row2);

  return container;
}

function updateTOSSSHOPPINGCalcDisplay(wrap, card) {
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

const tossshoppingCtx = {
  config: TOSSSHOPPING_CONFIG,
  state: tossshoppingState,
  boardEl: null,
  calcRowsClass: 'smartstore-calc-rows',
  recalc: recalcTOSSSHOPPINGCard,
  renderCalcRows: renderTOSSSHOPPINGCalcRows,
  updateCalcDisplay: updateTOSSSHOPPINGCalcDisplay,
  syncFields: ['name', 'option', 'sellingPrice', 'feeRate', 'warehouseFee', 'marketFee'],
  autoFieldNames: ['feeAmount', 'finalProfit', 'finalCost', 'multiBuyProfit'],
  save: saveTOSSSHOPPING,
  findCard: findTOSSSHOPPINGCard,
  addCard: addTOSSSHOPPINGCard,
  addCardAfter: addTOSSSHOPPINGCardAfter,
  confirmDelete: confirmDeleteTOSSSHOPPING,
  searchQuery: () => tossshoppingSearchQuery,
  matchesQuery: matchesTOSSSHOPPINGQuery,
  updateSearchCount: updateTOSSSHOPPINGSearchCount,
  updateToggleAllButton: updateTOSSSHOPPINGToggleAllButton,
  loadProductlistData: loadProductlistDataTOSSSHOPPING,
  computeProductlistTotal: computeProductlistTotalGeneric,
  newBundleItem: newBundleItem,
  findBundleItem: findBundleItem,
  addBundleItem: addBundleItem,
  removeBundleItem: removeBundleItem,
};

// ── 전역 함수 ───────────────────────────────────────────

function initTOSSSHOPPINGBoard() { return initPageBoard(tossshoppingCtx); }
function renderTOSSSHOPPING() { return renderCardsPage(tossshoppingCtx); }
function resolveTOSSSHOPPINGCards() { return resolvePageCards(tossshoppingCtx); }
function toggleAllTOSSSHOPPINGCards(collapse) { return toggleAllPageCards(tossshoppingCtx, collapse); }
