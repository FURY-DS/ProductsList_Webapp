/* =====================================================
   state.js - 앱 상태 및 카드 데이터 모델
   ===================================================== */

const state = {
  cards: []
};

/** 새 카드 객체 생성 (기본값) */
function newCard() {
  return {
    id: generateId(),
    isEditing: true,
    isCollapsed: false,
    image: '',
    name: '',
    option: '',
    origin: '',
    rocket: '',
    nshipping: '',
    product: '',
    ny: '',
    link: '',
    link2: '',
    cost: '',
    rate: '',
    percent: ''
  };
}

/** ID로 카드 찾기 */
function findCard(id) {
  return state.cards.find(c => c.id === id);
}

/** ID로 카드 인덱스 찾기 */
function findCardIndex(id) {
  return state.cards.findIndex(c => c.id === id);
}
