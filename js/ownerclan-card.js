/* =====================================================
   ownerclan-card.js - 오너클랜 카드 (shared-card 기반)
   수식: 판매가 = 공급가입력 × 1.1 (자동계산)
         수수료 = feeRate × (공급가입력 + 마켓택배비)
         최종이익 = 공급가입력 - 최종원가 - 수수료 - 창고택배비 + 마켓택배비
         2개이상구매 = 공급가입력 - 최종원가 - 수수료
   ===================================================== */

// ── 페이지별 수식 ──────────────────────────────────────

function computeOWNERCLANFinalCost(card) {
  if (card.isBundle) {
    return round2(card.bundleItems.reduce((sum, item) => sum + parseNum(item.total), 0));
  }
  return parseNum(card.finalCost);
}

/** 판매가 자동 계산: 공급가입력 × 1.1 */
function computeOWNERCLANSellingPrice(card) {
  return round2(parseNum(card.supplyPrice) * 1.1);
}

/** 판매수수료 금액: feeRate × (공급가입력 + 마켓택배비) */
function computeOWNERCLANFeeAmount(card) {
  return round2(parseNum(card.feeRate) * (parseNum(card.supplyPrice) + parseNum(card.marketFee)));
}

/** 최종이익: 공급가입력 - 최종원가 - 수수료 - 창고택배비 + 마켓택배비 */
function computeOWNERCLANFinalProfit(card) {
  const feeAmount = computeOWNERCLANFeeAmount(card);
  return round2(
    parseNum(card.supplyPrice)
    - parseNum(card.finalCost)
    - feeAmount
    - parseNum(card.warehouseFee)
    + parseNum(card.marketFee)
  );
}

/** 2개이상구매: 공급가입력 - 최종원가 - 수수료 */
function computeOWNERCLANMultiBuyProfit(card) {
  const feeAmount = computeOWNERCLANFeeAmount(card);
  return round2(
    parseNum(card.supplyPrice)
    - parseNum(card.finalCost)
    - feeAmount
  );
}

function recalcOWNERCLANCard(card) {
  if (card.isBundle) {
    card.finalCost = computeOWNERCLANFinalCost(card);
  }
  card.sellingPrice = computeOWNERCLANSellingPrice(card);
  card.feeAmount = computeOWNERCLANFeeAmount(card);
  card.finalProfit = computeOWNERCLANFinalProfit(card);
  card.multiBuyProfit = computeOWNERCLANMultiBuyProfit(card);
}

// ── 페이지별 렌더링 ────────────────────────────────────

function renderOWNERCLANCalcRows(card) {
  const container = document.createElement('div');
  container.className = 'smartstore-calc-rows';

  // 1행: 최종원가 | 판매가(반) | 공급가입력 | 판매수수료
  const row1 = document.createElement('div');
  row1.className = 'field-row split-price';
  row1.appendChild(makePageField(ownerclanCtx, 'finalCost', card.finalCost, true));
  row1.appendChild(makePageField(ownerclanCtx, 'sellingPrice', card.sellingPrice, true));
  row1.appendChild(makePageField(ownerclanCtx, 'supplyPrice', card.supplyPrice, !card.isEditing));
  row1.appendChild(makePageFeeField(ownerclanCtx, card));
  container.appendChild(row1);

  // 2행: 창고택배비 | 마켓택배비 | 최종이익 | 2개이상구매
  const row2 = document.createElement('div');
  row2.className = 'field-row split-profit';
  row2.appendChild(makePageField(ownerclanCtx, 'warehouseFee', card.warehouseFee, !card.isEditing));
  row2.appendChild(makePageField(ownerclanCtx, 'marketFee', card.marketFee, !card.isEditing));
  row2.appendChild(makePageField(ownerclanCtx, 'finalProfit', card.finalProfit, true));
  row2.appendChild(makePageField(ownerclanCtx, 'multiBuyProfit', card.multiBuyProfit, true));
  container.appendChild(row2);

  return container;
}

function updateOWNERCLANCalcDisplay(wrap, card) {
  const sellingPriceEl = wrap.querySelector('input[name="sellingPrice"]');
  const finalCostEl = wrap.querySelector('input[name="finalCost"]');
  const feeAmountEl = wrap.querySelector('input[name="feeAmount"]');
  const finalProfitEl = wrap.querySelector('input[name="finalProfit"]');
  const multiBuyProfitEl = wrap.querySelector('input[name="multiBuyProfit"]');
  if (sellingPriceEl) sellingPriceEl.value = formatNumber(parseNum(card.sellingPrice));
  if (finalCostEl) finalCostEl.value = formatNumber(parseNum(card.finalCost));
  if (feeAmountEl) feeAmountEl.value = formatNumber(parseNum(card.feeAmount));
  if (finalProfitEl) finalProfitEl.value = formatNumber(parseNum(card.finalProfit));
  if (multiBuyProfitEl) multiBuyProfitEl.value = formatNumber(parseNum(card.multiBuyProfit));
}

// ── 컨텍스트 ───────────────────────────────────────────

const ownerclanCtx = {
  config: OWNERCLAN_CONFIG,
  state: ownerclanState,
  boardEl: null,
  cardClass: 'ownerclan-card',
  calcRowsClass: 'smartstore-calc-rows',
  recalc: recalcOWNERCLANCard,
  renderCalcRows: renderOWNERCLANCalcRows,
  updateCalcDisplay: updateOWNERCLANCalcDisplay,
  syncFields: ['name', 'option', 'supplyPrice', 'feeRate', 'warehouseFee', 'marketFee'],
  autoFieldNames: ['feeAmount', 'finalProfit', 'finalCost', 'multiBuyProfit', 'sellingPrice'],
  save: saveOWNERCLAN,
  findCard: findOWNERCLANCard,
  addCard: addOWNERCLANCard,
  addCardAfter: addOWNERCLANCardAfter,
  confirmDelete: confirmDeleteOWNERCLAN,
  searchQuery: () => ownerclanSearchQuery,
  matchesQuery: matchesOWNERCLANQuery,
  updateSearchCount: updateOWNERCLANSearchCount,
  updateToggleAllButton: updateOWNERCLANToggleAllButton,
  loadProductlistData: loadProductlistDataOWNERCLAN,
  computeProductlistTotal: computeProductlistTotalGeneric,
  newBundleItem: newBundleItem,
  findBundleItem: findBundleItem,
  addBundleItem: addBundleItem,
  removeBundleItem: removeBundleItem,
};

// ── 전역 함수 ───────────────────────────────────────────

function initOWNERCLANBoard() { return initPageBoard(ownerclanCtx); }
function renderOWNERCLAN() { return renderCardsPage(ownerclanCtx); }
function resolveOWNERCLANCards() { return resolvePageCards(ownerclanCtx); }
function toggleAllOWNERCLANCards(collapse) { return toggleAllPageCards(ownerclanCtx, collapse); }
