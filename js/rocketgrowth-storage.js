/* =====================================================
   rocketgrowth-storage.js - 로켓그로스 데이터 저장 / 불러오기
   (실제 로직은 shared-storage.js의 제네릭 함수 사용)
   ===================================================== */

/** 로켓그로스 카드 데이터를 localStorage에 저장 */
function saveRocketgrowth() {
  return savePageData(ROCKETGROWTH_CONFIG, rocketgrowthState);
}

/** 로켓그로스 카드 데이터를 localStorage에서 불러오기 */
function loadRocketgrowth() {
  loadPageData(ROCKETGROWTH_CONFIG, rocketgrowthState, newRocketgrowthCard, newRocketgrowthBundleItem);
}

/** 상품리스트 페이지의 데이터를 localStorage에서 읽어오기 */
function loadProductlistDataForRocketgrowth() {
  return loadProductlistDataForPage(ROCKETGROWTH_CONFIG);
}
