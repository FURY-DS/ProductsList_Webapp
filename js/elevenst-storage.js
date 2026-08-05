/* =====================================================
   elevenst-storage.js - 11번가 데이터 저장 / 불러오기
   (실제 로직은 shared-storage.js의 제네릭 함수 사용)
   ===================================================== */

/** 11번가 카드 데이터를 localStorage에 저장 */
function saveElevenst() {
  return savePageData(ELEVENST_CONFIG, elevenstState);
}

/** 11번가 카드 데이터를 localStorage에서 불러오기 */
function loadElevenst() {
  loadPageData(ELEVENST_CONFIG, elevenstState, newElevenstCard, newBundleItem);
}

/** 상품리스트 페이지의 데이터를 localStorage에서 읽어오기 */
function loadProductlistData() {
  return loadProductlistDataForPage(ELEVENST_CONFIG);
}
