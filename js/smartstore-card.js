/* =====================================================
   smartstore-card.js - 스마트스토어 카드 (shared-card 기반)
   수식: 표준 (판매가 기준, +마켓택배비, multiBuyProfit 있음)
   ===================================================== */

// ── 페이지별 수식 ──────────────────────────────────────

function computeSmartstoreFinalCost(card) {
  if (card.isBundle) {
    return round2(card.bundleItems.reduce((sum, item) => sum + parseNum(item.total), 0));
  }
  return parseNum(card.finalCost);
}

function computeSmartstoreFeeAmount(card) {
  return round2(parseNum(card.sellingPrice) * parseNum(card.feeRate));
}

function computeSmartstoreFinalProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
    - parseNum(card.warehouseFee)
    + parseNum(card.marketFee)
  );
}

function computeSmartstoreMultiBuyProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
  );
}

function recalcSmartstoreCard(card) {
  if (card.isBundle) {
    card.finalCost = computeSmartstoreFinalCost(card);
  }
  card.feeAmount = computeSmartstoreFeeAmount(card);
  card.finalProfit = computeSmartstoreFinalProfit(card);
  card.multiBuyProfit = computeSmartstoreMultiBuyProfit(card);
}

// ── 페이지별 렌더링 ────────────────────────────────────

function renderSmartstoreCalcRows(card) {
  const container = document.createElement('div');
  container.className = 'smartstore-calc-rows';

  const row1 = document.createElement('div');
  row1.className = 'field-row three';
  row1.appendChild(makePageField(smartstoreCtx, 'finalCost', card.finalCost, true));
  row1.appendChild(makePageField(smartstoreCtx, 'sellingPrice', card.sellingPrice, !card.isEditing));
  row1.appendChild(makePageFeeField(smartstoreCtx, card));
  container.appendChild(row1);

  const row2 = document.createElement('div');
  row2.className = 'field-row split-profit';
  row2.appendChild(makePageField(smartstoreCtx, 'warehouseFee', card.warehouseFee, !card.isEditing));
  row2.appendChild(makePageField(smartstoreCtx, 'marketFee', card.marketFee, !card.isEditing));
  row2.appendChild(makePageField(smartstoreCtx, 'finalProfit', card.finalProfit, true));
  row2.appendChild(makePageField(smartstoreCtx, 'multiBuyProfit', card.multiBuyProfit, true));
  container.appendChild(row2);

  return container;
}

function updateSmartstoreCalcDisplay(wrap, card) {
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

const smartstoreCtx = {
  config: SMARTSTORE_CONFIG,
  state: smartstoreState,
  boardEl: null,
  calcRowsClass: 'smartstore-calc-rows',
  recalc: recalcSmartstoreCard,
  renderCalcRows: renderSmartstoreCalcRows,
  updateCalcDisplay: updateSmartstoreCalcDisplay,
  syncFields: ['name', 'option', 'sellingPrice', 'feeRate', 'warehouseFee', 'marketFee'],
  autoFieldNames: ['feeAmount', 'finalProfit', 'finalCost', 'multiBuyProfit'],
  save: saveSmartstore,
  findCard: findSmartstoreCard,
  addCard: addSmartstoreCard,
  addCardAfter: addSmartstoreCardAfter,
  confirmDelete: confirmDeleteSmartstore,
  searchQuery: () => smartstoreSearchQuery,
  matchesQuery: matchesSmartstoreQuery,
  updateSearchCount: updateSmartstoreSearchCount,
  updateToggleAllButton: updateSmartstoreToggleAllButton,
  loadProductlistData: loadProductlistData,
  computeProductlistTotal: computeProductlistTotalGeneric,
  newBundleItem: newBundleItem,
  findBundleItem: findBundleItem,
  addBundleItem: addBundleItem,
  removeBundleItem: removeBundleItem,
};

// ── 전역 함수 ───────────────────────────────────────────

function initSmartstoreBoard() { return initPageBoard(smartstoreCtx); }
function renderSmartstore() { return renderCardsPage(smartstoreCtx); }
function resolveSmartstoreCards() { return resolvePageCards(smartstoreCtx); }
function toggleAllSmartstoreCards(collapse) { return toggleAllPageCards(smartstoreCtx, collapse); }
