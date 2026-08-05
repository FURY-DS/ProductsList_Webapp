/* =====================================================
   always-storage.js - 올웨이즈 데이터 저장 / 불러오기
   (실제 로직은 shared-storage.js의 제네릭 함수 사용)
   ===================================================== */

/** 올웨이즈 카드 데이터를 localStorage에 저장 */
function saveALWAYS() {
  return savePageData(ALWAYS_CONFIG, alwaysState);
}

/** 올웨이즈 카드 데이터를 localStorage에서 불러오기 */
function loadALWAYS() {
  loadPageData(ALWAYS_CONFIG, alwaysState, newALWAYSCard, newBundleItem);
}

/** 마켓노트 페이지의 데이터를 localStorage에서 읽어오기 */
function loadProductlistDataALWAYS() {
  return loadProductlistDataForPage(ALWAYS_CONFIG);
}
