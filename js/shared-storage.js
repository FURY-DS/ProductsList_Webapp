/* =====================================================
   shared-storage.js - 서브페이지 공통 저장/불러오기 로직
   10개 서브페이지(smartstore, always, coupang, domagguk, elevenst,
   esm, nshipping, ownerclan, rocketgrowth, tossshopping)의
   storage 파일에서 중복되는 save/load/clean 패턴을 통합.
   각 페이지의 *-storage.js는 이 모듈의 제네릭 함수를 호출하는
   thin wrapper 역할만 수행한다.
   ===================================================== */

/**
 * 카드 배열을 localStorage에 저장 (백업 동시 갱신, 용량 초과 시 이미지 제거 후 재시도).
 * @param {Object} config - 페이지 CONFIG 객체 (STORAGE_KEY, IMAGE_REMOVE_ON_SAVE_FAIL, MESSAGES 포함)
 * @param {Object} state  - 페이지 state 객체 ({ cards: [] } 구조)
 * @returns {{ ok: boolean, imagesRemoved?: boolean, msg?: string }}
 */
function savePageData(config, state) {
  const storageKey = getUserScopedKey(config.STORAGE_KEY);
  // 먼저 이미지를 포함한 원본 데이터로 저장 시도
  try {
    const data = JSON.stringify(state.cards);
    localStorage.setItem(storageKey, data);
    try {
      localStorage.setItem(storageKey + '_backup', data);
    } catch (backupError) {
      console.warn('Backup save failed', backupError);
    }
    return { ok: true };
  } catch (e) {
    if (!isStorageQuotaError(e) || !config.IMAGE_REMOVE_ON_SAVE_FAIL) {
      return { ok: false, msg: config.MESSAGES.SAVE_FAIL + (e.message || '') };
    }
  }

  // 용량 초과 시 이미지 필드를 제거한 뒤 재시도
  const cleaned = cleanCardsForSave(state.cards);
  try {
    const data = JSON.stringify(cleaned);
    localStorage.setItem(storageKey, data);
    try {
      localStorage.setItem(storageKey + '_backup', data);
    } catch (backupError) {
      console.warn('Backup save failed', backupError);
    }
    // 메모리 상태도 이미지 없이 동기화 (다음 저장 시도 방지)
    state.cards = cleaned;
    return { ok: true, imagesRemoved: true };
  } catch (e2) {
    return { ok: false, msg: config.MESSAGES.SAVE_FAIL_QUOTA };
  }
}

/**
 * 저장용 데이터에서 이미지 필드 제거 (localStorage 용량 절약).
 * 카드 자체의 image와 복수품 bundleItems의 image를 모두 제거한다.
 * @param {Array} cards - 카드 배열
 * @returns {Array} 이미지가 제거된 카드 배열
 */
function cleanCardsForSave(cards) {
  return cards.map(c => {
    const cleaned = { ...c, image: '' };
    if (Array.isArray(c.bundleItems)) {
      cleaned.bundleItems = c.bundleItems.map(item => ({ ...item, image: '' }));
    }
    return cleaned;
  });
}

/**
 * localStorage에서 카드 데이터를 불러와 state.cards에 설정 (손상 시 백업 복구).
 * @param {Object} config          - 페이지 CONFIG 객체 (STORAGE_KEY, MESSAGES 포함)
 * @param {Object} state           - 페이지 state 객체 ({ cards: [] } 구조)
 * @param {Function} newCardFn     - 새 카드 기본값 생성 함수 (예: newSmartstoreCard)
 * @param {Function} newBundleItemFn - 새 복수품 항목 기본값 생성 함수 (예: newBundleItem)
 */
function loadPageData(config, state, newCardFn, newBundleItemFn) {
  try {
    const storageKey = migrateLegacyKeyToUserScope(config.STORAGE_KEY, Array.isArray);
    let raw = localStorage.getItem(storageKey);
    let data = null;

    if (raw) {
      try { data = JSON.parse(raw); } catch (e) { data = null; }
    }

    if (!Array.isArray(data)) {
      const backupRaw = localStorage.getItem(storageKey + '_backup');
      if (backupRaw) {
        try { data = JSON.parse(backupRaw); } catch (e) { data = null; }
      }
    }

    if (!Array.isArray(data)) return;

    state.cards = data.filter(c => c && typeof c === 'object').map(c => {
      const defaults = newCardFn();
      const bundleItems = (Array.isArray(c.bundleItems) ? c.bundleItems : [])
        .filter(item => item && typeof item === 'object')
        .map(item => ({ ...newBundleItemFn(), ...item, id: item.id || generateId() }));

      const card = {
        ...defaults,
        ...c,
        id: c.id || defaults.id,
        isEditing: typeof c.isEditing === 'boolean' ? c.isEditing : false,
        isCollapsed: typeof c.isCollapsed === 'boolean' ? c.isCollapsed : false,
        isBundle: typeof c.isBundle === 'boolean' ? c.isBundle : false,
        bundleItems: bundleItems
      };
      // 이미지는 사용자가 직접 업로드한 경우에만 존재하며, 상품리스트 실시간 조회값은 저장하지 않음
      card.image = c.image || '';
      card.bundleItems.forEach(item => { item.image = item.image || ''; });
      return card;
    });
  } catch (e) {
    console.warn(config.MESSAGES.LOAD_FAIL, e);
  }
}

/**
 * 상품리스트 페이지의 데이터를 localStorage에서 읽어오기.
 * @param {Object} config - 페이지 CONFIG 객체 (PRODUCTLIST_STORAGE_KEY 포함)
 * @returns {Array} 상품리스트 데이터 배열 (없으면 빈 배열)
 */
function loadProductlistDataForPage(config) {
  try {
    const raw = getUserScopedItemWithFallback(config.PRODUCTLIST_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('상품리스트 데이터 읽기 실패', e);
    return [];
  }
}
