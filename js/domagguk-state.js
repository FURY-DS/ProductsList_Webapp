/* =====================================================
   smartstore-state.js - 도매꾹 상태 및 카드 데이터 모델
   ===================================================== */

const domaggukState = {
  cards: []
};

/** 새 도매꾹 카드 객체 생성 */
function newDOMAGGUKCard() {
  return {
    id: generateId(),
    isEditing: true,
    isCollapsed: false,
    isBundle: false,

    // 단품 모드용: 판매자상품코드 입력
    sellerCode: '',

    // 마켓노트에서 자동 불러오는 필드
    image: '',
    name: '',
    option: '',

    // 비용/계산 필드
    finalCost: '',     // 최종원가 (마켓노트 총합 또는 복수품 합계)
    sellingPrice: '',  // 판매가
    feeRate: '',       // 판매수수료 비율 (예: 0.1)
    feeAmount: '',     // 판매수수료 최종결과값
    warehouseFee: '',  // 창고택배비
    marketFee: '',     // 마켓택배비
    finalProfit: '',   // 최종이익
    multiBuyProfit: '',// 2개이상구매 이익 (판매가 - 최종원가 - 판매수수료)

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
    total: '' // 마켓노트 총합
  };
}

/** ID로 도매꾹 카드 찾기 */
function findDOMAGGUKCard(id) {
  return domaggukState.cards.find(c => c.id === id);
}

/** ID로 도매꾹 카드 인덱스 찾기 */
function findDOMAGGUKCardIndex(id) {
  return domaggukState.cards.findIndex(c => c.id === id);
}

/** 카드 ID와 항목 ID로 복수품 항목 찾기 */
function findBundleItem(cardId, itemId) {
  const card = findDOMAGGUKCard(cardId);
  if (!card) return null;
  return card.bundleItems.find(i => i.id === itemId);
}
