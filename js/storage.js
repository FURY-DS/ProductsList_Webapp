/* =====================================================
   storage.js - localStorage 저장 / 불러오기
   ===================================================== */

/** 상품 데이터를 localStorage에 저장 */
function save() {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.cards));
  } catch (e) {
    showToast(CONFIG.MESSAGES.SAVE_FAIL + e.message);
  }
}

/** localStorage에서 상품 데이터 불러오기 */
function load() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      // 마이그레이션: 없는 필드는 기본값으로 보정
      state.cards = data.map(c => ({
        ...c,
        isEditing: typeof c.isEditing === 'boolean' ? c.isEditing : false,
        isCollapsed: typeof c.isCollapsed === 'boolean' ? c.isCollapsed : false
      }));
    }
  } catch (e) {
    console.warn(CONFIG.MESSAGES.LOAD_FAIL, e);
  }
}
