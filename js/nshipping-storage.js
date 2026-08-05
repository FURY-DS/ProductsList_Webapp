/* =====================================================
   nshipping-storage.js - N배송 데이터 저장 / 불러오기
   (실제 로직은 shared-storage.js의 제네릭 함수 사용)
   ===================================================== */

/** N배송 카드 데이터를 localStorage에 저장 */
function saveNshipping() {
  return savePageData(NSHIPPING_CONFIG, nshippingState);
}

/** N배송 카드 데이터를 localStorage에서 불러오기 */
function loadNshipping() {
  loadPageData(NSHIPPING_CONFIG, nshippingState, newNshippingCard, newNshippingBundleItem);
}

/** 마켓노트 페이지의 데이터를 localStorage에서 읽어오기 */
function loadProductlistDataForNshipping() {
  return loadProductlistDataForPage(NSHIPPING_CONFIG);
}
