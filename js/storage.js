/* =====================================================
   storage.js - localStorage 저장 / 불러오기
   ===================================================== */

/** 상품 데이터를 localStorage에 저장
 *  @returns {{ ok: boolean, imagesRemoved?: boolean, msg?: string }}
 */
function save() {
  // 먼저 이미지를 포함한 원본 데이터로 저장 시도
  try {
    const data = JSON.stringify(state.cards);
    localStorage.setItem(CONFIG.STORAGE_KEY, data);
    localStorage.setItem(CONFIG.STORAGE_KEY + '_backup', data);
    return { ok: true };
  } catch (e) {
    if (!isStorageQuotaError(e) || !CONFIG.IMAGE_REMOVE_ON_SAVE_FAIL) {
      return { ok: false, msg: CONFIG.MESSAGES.SAVE_FAIL + (e.message || '') };
    }
  }

  // 용량 초과 시 이미지 필드를 제거한 뒤 재시도
  const cleaned = cleanCardsForSave(state.cards);
  try {
    const data = JSON.stringify(cleaned);
    localStorage.setItem(CONFIG.STORAGE_KEY, data);
    localStorage.setItem(CONFIG.STORAGE_KEY + '_backup', data);
    // 메모리 상태도 이미지 없이 동기화 (다음 저장 시도 방지)
    state.cards = cleaned;
    return { ok: true, imagesRemoved: true };
  } catch (e2) {
    return { ok: false, msg: CONFIG.MESSAGES.SAVE_FAIL_QUOTA };
  }
}

/** localStorage 용량 초과 에러인지 확인 */
function isStorageQuotaError(e) {
  if (!e) return false;
  return e.name === 'QuotaExceededError' ||
    e.code === 22 ||
    e.code === 1014 ||
    (e.message && /quota|exceeded|storage/i.test(e.message));
}

/** 저장용 데이터에서 이미지 필드 제거 (localStorage 용량 절약) */
function cleanCardsForSave(cards) {
  return cards.map(c => ({ ...c, image: '' }));
}

/** localStorage에서 상품 데이터 불러오기 (손상 시 백업 복구) */
function load() {
  try {
    let raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    let data = null;

    if (raw) {
      try { data = JSON.parse(raw); } catch (e) { data = null; }
    }

    // 원본이 손상된 경우 백업에서 복구
    if (!Array.isArray(data)) {
      const backupRaw = localStorage.getItem(CONFIG.STORAGE_KEY + '_backup');
      if (backupRaw) {
        try { data = JSON.parse(backupRaw); } catch (e) { data = null; }
      }
    }

    if (!Array.isArray(data)) return;

    // 마이그레이션: 없는 필드는 기본값으로 보정
    state.cards = data.filter(c => c && typeof c === 'object').map(c => {
      const defaults = newCard();
      return {
        ...defaults,
        ...c,
        id: c.id || defaults.id,
        isEditing: typeof c.isEditing === 'boolean' ? c.isEditing : false,
        isCollapsed: typeof c.isCollapsed === 'boolean' ? c.isCollapsed : false,
        image: c.image || ''
      };
    });
  } catch (e) {
    console.warn(CONFIG.MESSAGES.LOAD_FAIL, e);
  }
}
