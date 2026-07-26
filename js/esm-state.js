/* =====================================================
   esm-state.js - ESM 상태 및 카드 데이터 모델
   ===================================================== */

const esmState = {
  cards: []
};

/** 새 ESM 카드 객체 생성 */
function newEsmCard() {
  return {
    id: generateId(),
    isEditing: true,
    isCollapsed: false,
    isBundle: false,

    // 단품 모드용: 판매자상품코드 입력
    sellerCode: '',

    // 상품리스트에서 자동 불러오는 필드
    image: '',
    name: '',
    option: '',

    // 비용/계산 필드
    finalCost: '',     // 최종원가 (상품리스트 총합 또는 복수품 합계)
    sellingPrice: '',  // 판매가
    feeRate: '',       // 판매수수료 비율 (예: 0.1)
    feeAmount: '',     // 판매수수료 최종결과값
    warehouseFee: '',  // 창고택배비
    marketFee: '',     // 마켓택배비
    finalProfit: '',   // 최종이익

    // 복수품 모드용 항목 목록
    bundleItems: []
  };
}

/** 새 복수품 항목 객체 생성 */
function newBundleItem() {
  return {
    id: generateId(),
    sellerCode: '',
    image: '',
    name: '',
    option: '',
    total: '' // 상품리스트 총합
  };
}

/** ID로 ESM 카드 찾기 */
function findEsmCard(id) {
  return esmState.cards.find(c => c.id === id);
}

/** ID로 ESM 카드 인덱스 찾기 */
function findEsmCardIndex(id) {
  return esmState.cards.findIndex(c => c.id === id);
}

/** 카드 ID와 항목 ID로 복수품 항목 찾기 */
function findBundleItem(cardId, itemId) {
  const card = findEsmCard(cardId);
  if (!card) return null;
  return card.bundleItems.find(i => i.id === itemId);
}
