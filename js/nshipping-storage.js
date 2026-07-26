/* =====================================================
   nshipping-storage.js - N배송 데이터 저장 / 불러오기
   ===================================================== */

/** N배송 카드 데이터를 localStorage에 저장 (동시에 백업도 갱신) */
function saveNshipping() {
  // 먼저 이미지를 포함한 원본 데이터로 저장 시도
  try {
    const data = JSON.stringify(nshippingState.cards);
    localStorage.setItem(NSHIPPING_CONFIG.STORAGE_KEY, data);
    localStorage.setItem(NSHIPPING_CONFIG.STORAGE_KEY + '_backup', data);
    return { ok: true };
  } catch (e) {
    if (!isNshippingStorageQuotaError(e) || !NSHIPPING_CONFIG.IMAGE_REMOVE_ON_SAVE_FAIL) {
      return { ok: false, msg: NSHIPPING_CONFIG.MESSAGES.SAVE_FAIL + (e.message || '') };
    }
  }

  // 용량 초과 시 이미지 필드를 제거한 뒤 재시도
  const cleaned = cleanNshippingCardsForSave(nshippingState.cards);
  try {
    const data = JSON.stringify(cleaned);
    localStorage.setItem(NSHIPPING_CONFIG.STORAGE_KEY, data);
    localStorage.setItem(NSHIPPING_CONFIG.STORAGE_KEY + '_backup', data);
    // 메모리 상태도 이미지 없이 동기화 (다음 저장 시도 방지)
    nshippingState.cards = cleaned;
    return { ok: true, imagesRemoved: true };
  } catch (e2) {
    return { ok: false, msg: NSHIPPING_CONFIG.MESSAGES.SAVE_FAIL_QUOTA };
  }
}

/** 저장용 데이터에서 이미지 필드 제거 (localStorage 용량 절약) */
function cleanNshippingCardsForSave(cards) {
  return cards.map(c => {
    const cleaned = { ...c, image: '' };
    if (Array.isArray(c.bundleItems)) {
      cleaned.bundleItems = c.bundleItems.map(item => ({ ...item, image: '' }));
    }
    return cleaned;
  });
}

/** localStorage 용량 초과 에러인지 확인 */
function isNshippingStorageQuotaError(e) {
  if (!e) return false;
  return e.name === 'QuotaExceededError' ||
    e.code === 22 ||
    e.code === 1014 ||
    (e.message && /quota|exceeded|storage/i.test(e.message));
}

/** N배송 카드 데이터를 localStorage에서 불러오기 (손상 시 백업 복구) */
function loadNshipping() {
  try {
    let raw = localStorage.getItem(NSHIPPING_CONFIG.STORAGE_KEY);
    let data = null;

    if (raw) {
      try { data = JSON.parse(raw); } catch (e) { data = null; }
    }

    if (!Array.isArray(data)) {
      const backupRaw = localStorage.getItem(NSHIPPING_CONFIG.STORAGE_KEY + '_backup');
      if (backupRaw) {
        try { data = JSON.parse(backupRaw); } catch (e) { data = null; }
      }
    }

    if (!Array.isArray(data)) return;

    nshippingState.cards = data.filter(c => c && typeof c === 'object').map(c => {
      const defaults = newNshippingCard();
      const bundleItems = (Array.isArray(c.bundleItems) ? c.bundleItems : [])
        .filter(item => item && typeof item === 'object')
        .map(item => ({ ...newNshippingBundleItem(), ...item, id: item.id || generateId() }));

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
    console.warn(NSHIPPING_CONFIG.MESSAGES.LOAD_FAIL, e);
  }
}

/** 상품리스트 페이지의 데이터를 localStorage에서 읽어오기 */
function loadProductlistDataForNshipping() {
  try {
    const raw = localStorage.getItem(NSHIPPING_CONFIG.PRODUCTLIST_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('상품리스트 데이터 읽기 실패', e);
    return [];
  }
}
