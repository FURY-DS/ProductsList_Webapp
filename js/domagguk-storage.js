/* =====================================================
   domagguk-storage.js - 도매꾹 데이터 저장 / 불러오기
   (실제 로직은 shared-storage.js의 제네릭 함수 사용)
   ===================================================== */

/** 도매꾹 카드 데이터를 localStorage에 저장 */
function saveDOMAGGUK() {
  return savePageData(DOMAGGUK_CONFIG, domaggukState);
}

/** 도매꾹 카드 데이터를 localStorage에서 불러오기 */
function loadDOMAGGUK() {
  loadPageData(DOMAGGUK_CONFIG, domaggukState, newDOMAGGUKCard, newBundleItem);
}

/** 상품리스트 페이지의 데이터를 localStorage에서 읽어오기 */
function loadProductlistDataDOMAGGUK() {
  return loadProductlistDataForPage(DOMAGGUK_CONFIG);
}
