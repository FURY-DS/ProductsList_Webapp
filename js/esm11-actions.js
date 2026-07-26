/* =====================================================
   esm11-actions.js - ESM/11번가 상단 액션 및 카드 동작
   ===================================================== */

/** 액션 버튼 초기화 */
function initEsm11Actions() {
  document.getElementById('btn-export').addEventListener('click', exportEsm11Data);
  document.getElementById('btn-import').addEventListener('click', importEsm11Data);
  document.getElementById('import-input').addEventListener('change', handleEsm11ImportFile);
  document.getElementById('btn-clear').addEventListener('click', clearAllEsm11);
}

/** JSON 파일로 데이터 내보내기 */
function exportEsm11Data() {
  try {
    const exportData = { _page: ESM11_CONFIG.PAGE_ID, data: esm11State.cards };
    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ESM/11번가_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(ESM11_CONFIG.MESSAGES.EXPORT_DONE);
  } catch (err) {
    showToast(ESM11_CONFIG.MESSAGES.EXPORT_FAIL + err.message);
  }
}

/** 파일 선택 다이얼로그 열기 */
function importEsm11Data() {
  document.getElementById('import-input').click();
}

/** 가져오기 파일 처리 */
function handleEsm11ImportFile(e) {
  const f = e.target.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      let data;

      // 새 형식: { _page: 'smartstore'|'coupang'|'esm11', data: [...] }
      if (parsed && !Array.isArray(parsed) && parsed._page && parsed.data) {
        if (!ESM11_CONFIG.COMPATIBLE_PAGES.includes(parsed._page)) {
          showToast(ESM11_CONFIG.MESSAGES.IMPORT_WRONG_PAGE(parsed._page));
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

      showModal({
        title: ESM11_CONFIG.MESSAGES.IMPORT_TITLE,
        text: ESM11_CONFIG.MESSAGES.IMPORT_TEXT(esm11State.cards.length),
        onConfirm: () => {
          esm11State.cards = data;
          saveEsm11();
          renderEsm11();
          showToast(ESM11_CONFIG.MESSAGES.IMPORT_DONE(data.length));
        }
      });

      const cancelBtn = document.getElementById('modal-cancel');
      const onceHandler = () => {
        cancelBtn.removeEventListener('click', onceHandler);
        esm11State.cards = esm11State.cards.concat(data);
        saveEsm11();
        renderEsm11();
        showToast(ESM11_CONFIG.MESSAGES.IMPORT_ADDED(data.length));
      };
      cancelBtn.addEventListener('click', onceHandler, { once: true });
    } catch (err) {
      showToast(ESM11_CONFIG.MESSAGES.IMPORT_FAIL + err.message);
    }
  };
  r.readAsText(f);
  e.target.value = '';
}

/** 전체 삭제 */
function clearAllEsm11() {
  if (esm11State.cards.length === 0) {
    showToast(ESM11_CONFIG.MESSAGES.NOTHING_DELETE);
    return;
  }
  showModal({
    title: ESM11_CONFIG.MESSAGES.CLEAR_TITLE,
    text: ESM11_CONFIG.MESSAGES.CLEAR_TEXT(esm11State.cards.length),
    onConfirm: () => {
      esm11State.cards = [];
      saveEsm11();
      renderEsm11();
      showToast(ESM11_CONFIG.MESSAGES.ALL_DELETED);
    }
  });
}

/** 개별 카드 삭제 확인 */
function confirmDeleteEsm11(cardId) {
  const card = findEsm11Card(cardId);
  if (!card) return;
  const label = card.name ? `"${card.name}"` : '이 상품';
  showModal({
    title: ESM11_CONFIG.MESSAGES.DELETE_TITLE,
    text: ESM11_CONFIG.MESSAGES.DELETE_TEXT(label),
    onConfirm: () => {
      esm11State.cards = esm11State.cards.filter(c => c.id !== cardId);
      saveEsm11();
      renderEsm11();
      showToast(ESM11_CONFIG.MESSAGES.DELETED);
    }
  });
}

/** 새 카드 추가 (보드 끝) */
function addEsm11Card() {
  const c = newEsm11Card();
  esm11State.cards.push(c);
  saveEsm11();
  renderEsm11();
  scrollToEsm11Card(c.id);
}

/** 특정 카드 바로 뒤에 새 카드 추가 */
function addEsm11CardAfter(cardId) {
  const idx = findEsm11CardIndex(cardId);
  const c = newEsm11Card();
  if (idx < 0) {
    esm11State.cards.push(c);
  } else {
    esm11State.cards.splice(idx + 1, 0, c);
  }
  saveEsm11();
  renderEsm11();
  scrollToEsm11Card(c.id);
}

/** 카드로 부드러운 스크롤 */
function scrollToEsm11Card(cardId) {
  setTimeout(() => {
    const el = document.querySelector(`.smartstore-card[data-id="${cardId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
}

/** 복수품 항목 추가 */
function addBundleItem(cardId) {
  const card = findEsm11Card(cardId);
  if (!card) return;
  const item = newBundleItem();
  card.bundleItems.push(item);
  recalcEsm11Card(card);
  saveEsm11();
  renderEsm11();
  setTimeout(() => {
    const el = document.querySelector(`.smartstore-card[data-id="${cardId}"] .bundle-item[data-item-id="${item.id}"] input[name="itemSellerCode"]`);
    if (el) el.focus();
  }, 50);
}

/** 복수품 항목 삭제 */
function removeBundleItem(cardId, itemId) {
  const card = findEsm11Card(cardId);
  if (!card) return;
  card.bundleItems = card.bundleItems.filter(i => i.id !== itemId);
  // 항목이 모두 제거되면 단품 모드로 복귀
  if (card.bundleItems.length === 0) {
    card.isBundle = false;
  }
  recalcEsm11Card(card);
  saveEsm11();
  renderEsm11();
}
