/* =====================================================
   tossshopping-storage.js - 토스쇼핑 데이터 저장 / 불러오기
   (실제 로직은 shared-storage.js의 제네릭 함수 사용)
   ===================================================== */

/** 토스쇼핑 카드 데이터를 localStorage에 저장 */
function saveTOSSSHOPPING() {
  return savePageData(TOSSSHOPPING_CONFIG, tossshoppingState);
}

/** 토스쇼핑 카드 데이터를 localStorage에서 불러오기 */
function loadTOSSSHOPPING() {
  loadPageData(TOSSSHOPPING_CONFIG, tossshoppingState, newTOSSSHOPPINGCard, newBundleItem);
}

/** 상품리스트 페이지의 데이터를 localStorage에서 읽어오기 */
function loadProductlistDataTOSSSHOPPING() {
  return loadProductlistDataForPage(TOSSSHOPPING_CONFIG);
}
