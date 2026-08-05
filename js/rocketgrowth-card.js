/* =====================================================
   rocketgrowth-card.js - 로켓그로스 카드 (shared-card 기반)
   수식: 최종이익 = 판매가 - 최종원가 - 수수료 - 피킹라벨출고비 - 쿠팡입출고비용
   (marketFee를 빼기! multiBuyProfit 없음)
   ===================================================== */

// ── 페이지별 수식 ──────────────────────────────────────

function computeRocketgrowthFinalCost(card) {
  if (card.isBundle) {
    return round2(card.bundleItems.reduce((sum, item) => sum + parseNum(item.total), 0));
  }
  return parseNum(card.finalCost);
}

function computeRocketgrowthFeeAmount(card) {
  return round2(parseNum(card.sellingPrice) * parseNum(card.feeRate));
}

function computeRocketgrowthFinalProfit(card) {
  return round2(
    parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
    - parseNum(card.warehouseFee)
    - parseNum(card.marketFee)
  );
}

function recalcRocketgrowthCard(card) {
  if (card.isBundle) {
    card.finalCost = computeRocketgrowthFinalCost(card);
  }
  card.feeAmount = computeRocketgrowthFeeAmount(card);
  card.finalProfit = computeRocketgrowthFinalProfit(card);
}

// ── 페이지별 렌더링 ────────────────────────────────────

function renderRocketgrowthCalcRows(card) {
  const container = document.createElement('div');
  container.className = 'smartstore-calc-rows';

  // 1행: 최종원가 | 판매가 | 판매수수료
  const row1 = document.createElement('div');
  row1.className = 'field-row three';
  row1.appendChild(makePageField(rocketgrowthCtx, 'finalCost', card.finalCost, true));
  row1.appendChild(makePageField(rocketgrowthCtx, 'sellingPrice', card.sellingPrice, !card.isEditing));
  row1.appendChild(makePageFeeField(rocketgrowthCtx, card));
  container.appendChild(row1);

  // 2행: 피킹라벨출고비 | 쿠팡입출고비용 | 최종이익
  const row2 = document.createElement('div');
  row2.className = 'field-row three';
  row2.appendChild(makePageField(rocketgrowthCtx, 'warehouseFee', card.warehouseFee, !card.isEditing));
  row2.appendChild(makePageField(rocketgrowthCtx, 'marketFee', card.marketFee, !card.isEditing));
  row2.appendChild(makePageField(rocketgrowthCtx, 'finalProfit', card.finalProfit, true));
  container.appendChild(row2);

  return container;
}

function updateRocketgrowthCalcDisplay(wrap, card) {
  const finalCostEl = wrap.querySelector('input[name="finalCost"]');
  const feeAmountEl = wrap.querySelector('input[name="feeAmount"]');
  const finalProfitEl = wrap.querySelector('input[name="finalProfit"]');
  if (finalCostEl) finalCostEl.value = formatNumber(parseNum(card.finalCost));
  if (feeAmountEl) feeAmountEl.value = formatNumber(parseNum(card.feeAmount));
  if (finalProfitEl) finalProfitEl.value = formatNumber(parseNum(card.finalProfit));
}

// ── 컨텍스트 ───────────────────────────────────────────

const rocketgrowthCtx = {
  config: ROCKETGROWTH_CONFIG,
  state: rocketgrowthState,
  boardEl: null,
  cardClass: '',
  calcRowsClass: 'smartstore-calc-rows',
  recalc: recalcRocketgrowthCard,
  renderCalcRows: renderRocketgrowthCalcRows,
  updateCalcDisplay: updateRocketgrowthCalcDisplay,
  syncFields: ['name', 'option', 'sellingPrice', 'feeRate', 'warehouseFee', 'marketFee'],
  autoFieldNames: ['feeAmount', 'finalProfit', 'finalCost'],
  save: saveRocketgrowth,
  findCard: findRocketgrowthCard,
  addCard: addRocketgrowthCard,
  addCardAfter: addRocketgrowthCardAfter,
  confirmDelete: confirmDeleteRocketgrowth,
  searchQuery: () => rocketgrowthSearchQuery,
  matchesQuery: matchesRocketgrowthQuery,
  updateSearchCount: updateRocketgrowthSearchCount,
  updateToggleAllButton: updateRocketgrowthToggleAllButton,
  loadProductlistData: loadProductlistDataForRocketgrowth,
  computeProductlistTotal: computeProductlistTotalGeneric,
  newBundleItem: newRocketgrowthBundleItem,
  findBundleItem: findRocketgrowthBundleItem,
  addBundleItem: addRocketgrowthBundleItem,
  removeBundleItem: removeRocketgrowthBundleItem,
};

// ── 전역 함수 ───────────────────────────────────────────

function initRocketgrowthBoard() { return initPageBoard(rocketgrowthCtx); }
function renderRocketgrowth() { return renderCardsPage(rocketgrowthCtx); }
function resolveRocketgrowthCards() { return resolvePageCards(rocketgrowthCtx); }
function toggleAllRocketgrowthCards(collapse) { return toggleAllPageCards(rocketgrowthCtx, collapse); }
