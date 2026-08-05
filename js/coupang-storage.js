/* =====================================================
   coupang-storage.js - 쿠팡 데이터 저장 / 불러오기
   (실제 로직은 shared-storage.js의 제네릭 함수 사용)
   ===================================================== */

/** 쿠팡 카드 데이터를 localStorage에 저장 */
function saveCoupang() {
  return savePageData(COUPANG_CONFIG, coupangState);
}

/** 쿠팡 카드 데이터를 localStorage에서 불러오기 */
function loadCoupang() {
  loadPageData(COUPANG_CONFIG, coupangState, newCoupangCard, newBundleItem);
}

/** 마켓노트 페이지의 데이터를 localStorage에서 읽어오기 */
function loadProductlistData() {
  return loadProductlistDataForPage(COUPANG_CONFIG);
}
