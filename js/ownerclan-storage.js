/* =====================================================
   ownerclan-storage.js - 오너클랜 데이터 저장 / 불러오기
   (실제 로직은 shared-storage.js의 제네릭 함수 사용)
   ===================================================== */

/** 오너클랜 카드 데이터를 localStorage에 저장 */
function saveOWNERCLAN() {
  return savePageData(OWNERCLAN_CONFIG, ownerclanState);
}

/** 오너클랜 카드 데이터를 localStorage에서 불러오기 */
function loadOWNERCLAN() {
  loadPageData(OWNERCLAN_CONFIG, ownerclanState, newOWNERCLANCard, newBundleItem);
}

/** 마켓노트 페이지의 데이터를 localStorage에서 읽어오기 */
function loadProductlistDataOWNERCLAN() {
  return loadProductlistDataForPage(OWNERCLAN_CONFIG);
}
