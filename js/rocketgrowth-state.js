/* =====================================================
   rocketgrowth-state.js - 로켓그로스 상태 및 카드 데이터 모델
   ===================================================== */

const rocketgrowthState = {
  cards: []
};

/** 새 로켓그로스 카드 객체 생성 */
function newRocketgrowthCard() {
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
    warehouseFee: '',  // 피킹라벨출고비
    marketFee: '',     // 쿠팡입출고비용
    finalProfit: '',   // 최종이익

    // 복수품 모드용 항목 목록
    bundleItems: []
  };
}

/** 새 복수품 항목 객체 생성 */
function newRocketgrowthBundleItem() {
  return {
    id: generateId(),
    sellerCode: '',
    image: '',
    name: '',
    option: '',
    total: '' // 상품리스트 총합
  };
}

/** ID로 로켓그로스 카드 찾기 */
function findRocketgrowthCard(id) {
  return rocketgrowthState.cards.find(c => c.id === id);
}

/** ID로 로켓그로스 카드 인덱스 찾기 */
function findRocketgrowthCardIndex(id) {
  return rocketgrowthState.cards.findIndex(c => c.id === id);
}

/** 카드 ID와 항목 ID로 복수품 항목 찾기 */
function findRocketgrowthBundleItem(cardId, itemId) {
  const card = findRocketgrowthCard(cardId);
  if (!card) return null;
  return card.bundleItems.find(i => i.id === itemId);
}
