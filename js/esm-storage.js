/* =====================================================
   esm-storage.js - ESM 데이터 저장 / 불러오기
   (실제 로직은 shared-storage.js의 제네릭 함수 사용)
   ===================================================== */

/** ESM 카드 데이터를 localStorage에 저장 */
function saveEsm() {
  return savePageData(ESM_CONFIG, esmState);
}

/** ESM 카드 데이터를 localStorage에서 불러오기 */
function loadEsm() {
  loadPageData(ESM_CONFIG, esmState, newEsmCard, newBundleItem);
}

/** 마켓노트 페이지의 데이터를 localStorage에서 읽어오기 */
function loadProductlistData() {
  return loadProductlistDataForPage(ESM_CONFIG);
}
