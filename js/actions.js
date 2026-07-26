/* =====================================================
   actions.js - 상단 액션 버튼 (내보내기 / 가져오기 / 전체삭제)
   ===================================================== */

/** 액션 버튼 초기화 (DOM 로드 후 호출) */
function initActions() {
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-import').addEventListener('click', importData);
  document.getElementById('import-input').addEventListener('change', handleImportFile);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
}

/** JSON 파일로 데이터 내보내기 */
function exportData() {
  try {
    const exportData = { _page: CONFIG.PAGE_ID, data: state.cards };
    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `상품리스트_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(CONFIG.MESSAGES.EXPORT_DONE);
  } catch (err) {
    showToast(CONFIG.MESSAGES.EXPORT_FAIL + err.message);
  }
}

/** 파일 선택 다이얼로그 열기 */
function importData() {
  document.getElementById('import-input').click();
}

/** 가져오기 파일 처리 */
function handleImportFile(e) {
  const f = e.target.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      let data;

      // 새 형식: { _page: 'productlist', data: [...] }
      if (parsed && !Array.isArray(parsed) && parsed._page && parsed.data) {
        if (parsed._page !== CONFIG.PAGE_ID) {
          showToast(CONFIG.MESSAGES.IMPORT_WRONG_PAGE(parsed._page));
          return;
        }
        data = parsed.data;
      }
      // 기존 형식 (래핑 없는 배열): 허용
      else if (Array.isArray(parsed)) {
        data = parsed;
      }
      else {
        throw new Error('형식이 올바르지 않아요');
      }

      if (!Array.isArray(data)) throw new Error('형식이 올바르지 않아요');

      // 교체 확인 모달
      showModal({
        title: CONFIG.MESSAGES.IMPORT_TITLE,
        text: CONFIG.MESSAGES.IMPORT_TEXT(state.cards.length),
        onConfirm: () => {
          state.cards = data;
          save();
          render();
          showToast(CONFIG.MESSAGES.IMPORT_DONE(data.length));
        }
      });

      // 취소 시 추가 모드로 전환 (한 번만)
      const cancelBtn = document.getElementById('modal-cancel');
      const onceHandler = () => {
        cancelBtn.removeEventListener('click', onceHandler);
        state.cards = state.cards.concat(data);
        save();
        render();
        showToast(CONFIG.MESSAGES.IMPORT_ADDED(data.length));
      };
      cancelBtn.addEventListener('click', onceHandler, { once: true });
    } catch (err) {
      showToast(CONFIG.MESSAGES.IMPORT_FAIL + err.message);
    }
  };
  r.readAsText(f);
  e.target.value = '';
}

/** 전체 삭제 */
function clearAll() {
  if (state.cards.length === 0) {
    showToast(CONFIG.MESSAGES.NOTHING_DELETE);
    return;
  }
  showModal({
    title: CONFIG.MESSAGES.CLEAR_TITLE,
    text: CONFIG.MESSAGES.CLEAR_TEXT(state.cards.length),
    onConfirm: () => {
      state.cards = [];
      save();
      render();
      showToast(CONFIG.MESSAGES.ALL_DELETED);
    }
  });
}

/** 개별 카드 삭제 확인 */
function confirmDelete(cardId) {
  const card = findCard(cardId);
  if (!card) return;
  const label = card.name ? `"${card.name}"` : '이 상품';
  showModal({
    title: CONFIG.MESSAGES.DELETE_TITLE,
    text: CONFIG.MESSAGES.DELETE_TEXT(label),
    onConfirm: () => {
      state.cards = state.cards.filter(c => c.id !== cardId);
      save();
      render();
      showToast(CONFIG.MESSAGES.DELETED);
    }
  });
}

/** 새 카드 추가 (보드 끝) */
function addCard() {
  const c = newCard();
  state.cards.push(c);
  save();
  render();
  scrollToCard(c.id);
}

/** 특정 카드 바로 뒤에 새 카드 추가 */
function addCardAfter(cardId) {
  const idx = findCardIndex(cardId);
  const c = newCard();
  if (idx < 0) {
    state.cards.push(c);
  } else {
    state.cards.splice(idx + 1, 0, c);
  }
  save();
  render();
  scrollToCard(c.id);
}

/** 카드로 부드러운 스크롤 */
function scrollToCard(cardId) {
  setTimeout(() => {
    const el = document.querySelector(`.card[data-id="${cardId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
}
