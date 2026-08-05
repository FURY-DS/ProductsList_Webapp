/* =====================================================
   elevenst-card.js - 11번가 카드 (shared-card 기반)
   수식: 표준 (판매가 기준, +마켓택배비, multiBuyProfit 있음)
   ===================================================== */

// ── 페이지별 수식 ──────────────────────────────────────

function computeElevenstFinalCost(card) {
  if (card.isBundle) {
    return round2(card.bundleItems.reduce((sum, item) => sum + parseNum(item.total), 0));
  }
  return parseNum(card.finalCost);
}

function computeElevenstFeeAmount(card) {
  return round2(parseNum(card.sellingPrice) * parseNum(card.feeRate));
}

function computeElevenstFinalProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
    - parseNum(card.warehouseFee)
    + parseNum(card.marketFee)
  );
}

function computeElevenstMultiBuyProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
  );
}

function recalcElevenstCard(card) {
  if (card.isBundle) {
    card.finalCost = computeElevenstFinalCost(card);
  }
  card.feeAmount = computeElevenstFeeAmount(card);
  card.finalProfit = computeElevenstFinalProfit(card);
  card.multiBuyProfit = computeElevenstMultiBuyProfit(card);
}

// ── 페이지별 렌더링 ────────────────────────────────────

function renderElevenstCalcRows(card) {
  const container = document.createElement('div');
  container.className = 'smartstore-calc-rows';

  const row1 = document.createElement('div');
  row1.className = 'field-row three';
  row1.appendChild(makePageField(elevenstCtx, 'finalCost', card.finalCost, true));
  row1.appendChild(makePageField(elevenstCtx, 'sellingPrice', card.sellingPrice, !card.isEditing));
  row1.appendChild(makePageFeeField(elevenstCtx, card));
  container.appendChild(row1);

  const row2 = document.createElement('div');
  row2.className = 'field-row split-profit';
  row2.appendChild(makePageField(elevenstCtx, 'warehouseFee', card.warehouseFee, !card.isEditing));
  row2.appendChild(makePageField(elevenstCtx, 'marketFee', card.marketFee, !card.isEditing));
  row2.appendChild(makePageField(elevenstCtx, 'finalProfit', card.finalProfit, true));
  row2.appendChild(makePageField(elevenstCtx, 'multiBuyProfit', card.multiBuyProfit, true));
  container.appendChild(row2);

  return container;
}

function updateElevenstCalcDisplay(wrap, card) {
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

const elevenstCtx = {
  config: ELEVENST_CONFIG,
  state: elevenstState,
  boardEl: null,
  calcRowsClass: 'smartstore-calc-rows',
  recalc: recalcElevenstCard,
  renderCalcRows: renderElevenstCalcRows,
  updateCalcDisplay: updateElevenstCalcDisplay,
  syncFields: ['name', 'option', 'sellingPrice', 'feeRate', 'warehouseFee', 'marketFee'],
  autoFieldNames: ['feeAmount', 'finalProfit', 'finalCost', 'multiBuyProfit'],
  save: saveElevenst,
  findCard: findElevenstCard,
  addCard: addElevenstCard,
  addCardAfter: addElevenstCardAfter,
  confirmDelete: confirmDeleteElevenst,
  searchQuery: () => elevenstSearchQuery,
  matchesQuery: matchesElevenstQuery,
  updateSearchCount: updateElevenstSearchCount,
  updateToggleAllButton: updateElevenstToggleAllButton,
  loadProductlistData: loadProductlistData,
  computeProductlistTotal: computeProductlistTotalGeneric,
  newBundleItem: newBundleItem,
  findBundleItem: findBundleItem,
  addBundleItem: addBundleItem,
  removeBundleItem: removeBundleItem,
};

// ── 전역 함수 ───────────────────────────────────────────

function initElevenstBoard() { return initPageBoard(elevenstCtx); }
function renderElevenst() { return renderCardsPage(elevenstCtx); }
function resolveElevenstCards() { return resolvePageCards(elevenstCtx); }
function toggleAllElevenstCards(collapse) { return toggleAllPageCards(elevenstCtx, collapse); }
