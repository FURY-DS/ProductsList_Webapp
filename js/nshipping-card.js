/* =====================================================
   nshipping-card.js - N배송 카드 (shared-card 기반)
   수식: 최종이익 = 판매가 - 최종원가 - 수수료 - 창고택배비 + 마켓택배비
         - NY바코드비용 - 피킹비용 - 태그비용
   multiBuyProfit 없음, 3행 레이아웃
   ===================================================== */

// ── 페이지별 수식 ──────────────────────────────────────

function computeNshippingFinalCost(card) {
  if (card.isBundle) {
    return round2(card.bundleItems.reduce((sum, item) => sum + parseNum(item.total), 0));
  }
  return parseNum(card.finalCost);
}

function computeNshippingFeeAmount(card) {
  return round2(parseNum(card.sellingPrice) * parseNum(card.feeRate));
}

function computeNshippingFinalProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
    - parseNum(card.warehouseFee)
    + parseNum(card.marketFee)
    - parseNum(card.barcodeFee)
    - parseNum(card.pickingFee)
    - parseNum(card.tagFee)
  );
}

function recalcNshippingCard(card) {
  if (card.isBundle) {
    card.finalCost = computeNshippingFinalCost(card);
  }
  card.feeAmount = computeNshippingFeeAmount(card);
  card.finalProfit = computeNshippingFinalProfit(card);
}

// ── 페이지별 렌더링 ────────────────────────────────────

function renderNshippingCalcRows(card) {
  const container = document.createElement('div');
  container.className = 'smartstore-calc-rows';

  // 1행: 최종원가 | 판매가 | 판매수수료
  const row1 = document.createElement('div');
  row1.className = 'field-row three';
  row1.appendChild(makePageField(nshippingCtx, 'finalCost', card.finalCost, true));
  row1.appendChild(makePageField(nshippingCtx, 'sellingPrice', card.sellingPrice, !card.isEditing));
  row1.appendChild(makePageFeeField(nshippingCtx, card));
  container.appendChild(row1);

  // 2행: 창고택배비 | 마켓택배비 | 최종이익
  const row2 = document.createElement('div');
  row2.className = 'field-row three';
  row2.appendChild(makePageField(nshippingCtx, 'warehouseFee', card.warehouseFee, !card.isEditing));
  row2.appendChild(makePageField(nshippingCtx, 'marketFee', card.marketFee, !card.isEditing));
  row2.appendChild(makePageField(nshippingCtx, 'finalProfit', card.finalProfit, true));
  container.appendChild(row2);

  // 3행: NY바코드비용 | 피킹비용 | 태그비용
  const row3 = document.createElement('div');
  row3.className = 'field-row three';
  row3.appendChild(makePageField(nshippingCtx, 'barcodeFee', card.barcodeFee, !card.isEditing));
  row3.appendChild(makePageField(nshippingCtx, 'pickingFee', card.pickingFee, !card.isEditing));
  row3.appendChild(makePageField(nshippingCtx, 'tagFee', card.tagFee, !card.isEditing));
  container.appendChild(row3);

  return container;
}

function updateNshippingCalcDisplay(wrap, card) {
  const finalCostEl = wrap.querySelector('input[name="finalCost"]');
  const feeAmountEl = wrap.querySelector('input[name="feeAmount"]');
  const finalProfitEl = wrap.querySelector('input[name="finalProfit"]');
  if (finalCostEl) finalCostEl.value = formatNumber(parseNum(card.finalCost));
  if (feeAmountEl) feeAmountEl.value = formatNumber(parseNum(card.feeAmount));
  if (finalProfitEl) finalProfitEl.value = formatNumber(parseNum(card.finalProfit));
}

// ── 컨텍스트 ───────────────────────────────────────────

const nshippingCtx = {
  config: NSHIPPING_CONFIG,
  state: nshippingState,
  boardEl: null,
  cardClass: '',
  calcRowsClass: 'smartstore-calc-rows',
  recalc: recalcNshippingCard,
  renderCalcRows: renderNshippingCalcRows,
  updateCalcDisplay: updateNshippingCalcDisplay,
  syncFields: ['name', 'option', 'sellingPrice', 'feeRate', 'warehouseFee', 'marketFee', 'barcodeFee', 'pickingFee', 'tagFee'],
  autoFieldNames: ['feeAmount', 'finalProfit', 'finalCost'],
  save: saveNshipping,
  findCard: findNshippingCard,
  addCard: addNshippingCard,
  addCardAfter: addNshippingCardAfter,
  confirmDelete: confirmDeleteNshipping,
  searchQuery: () => nshippingSearchQuery,
  matchesQuery: matchesNshippingQuery,
  updateSearchCount: updateNshippingSearchCount,
  updateToggleAllButton: updateNshippingToggleAllButton,
  loadProductlistData: loadProductlistDataForNshipping,
  computeProductlistTotal: computeProductlistTotalGeneric,
  newBundleItem: newNshippingBundleItem,
  findBundleItem: findNshippingBundleItem,
  addBundleItem: addNshippingBundleItem,
  removeBundleItem: removeNshippingBundleItem,
};

// ── 전역 함수 ───────────────────────────────────────────

function initNshippingBoard() { return initPageBoard(nshippingCtx); }
function renderNshipping() { return renderCardsPage(nshippingCtx); }
function resolveNshippingCards() { return resolvePageCards(nshippingCtx); }
function toggleAllNshippingCards(collapse) { return toggleAllPageCards(nshippingCtx, collapse); }
