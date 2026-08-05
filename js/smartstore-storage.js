/* =====================================================
   smartstore-storage.js - 스마트스토어 데이터 저장 / 불러오기
   (실제 로직은 shared-storage.js의 제네릭 함수 사용)
   ===================================================== */

/** 스마트스토어 카드 데이터를 localStorage에 저장 */
function saveSmartstore() {
  return savePageData(SMARTSTORE_CONFIG, smartstoreState);
}

/** 스마트스토어 카드 데이터를 localStorage에서 불러오기 */
function loadSmartstore() {
  loadPageData(SMARTSTORE_CONFIG, smartstoreState, newSmartstoreCard, newBundleItem);
}

/** 마켓노트 페이지의 데이터를 localStorage에서 읽어오기 */
function loadProductlistData() {
  return loadProductlistDataForPage(SMARTSTORE_CONFIG);
}
