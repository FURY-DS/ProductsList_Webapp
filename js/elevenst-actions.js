/* =====================================================
   elevenst-actions.js - 11번가 상단 액션 및 카드 동작
   ===================================================== */

/** 액션 버튼 초기화 */
function initElevenstActions() {
  document.getElementById('btn-export').addEventListener('click', exportElevenstData);
  document.getElementById('btn-import').addEventListener('click', importElevenstData);
  document.getElementById('import-input').addEventListener('change', handleElevenstImportFile);
  document.getElementById('btn-clear').addEventListener('click', clearAllElevenst);
}

/** JSON 파일로 데이터 내보내기 */
function exportElevenstData() {
  try {
    const exportData = { _page: ELEVENST_CONFIG.PAGE_ID, data: elevenstState.cards };
    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `11번가_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(ELEVENST_CONFIG.MESSAGES.EXPORT_DONE);
  } catch (err) {
    showToast(ELEVENST_CONFIG.MESSAGES.EXPORT_FAIL + err.message);
  }
}

/** 파일 선택 다이얼로그 열기 */
function importElevenstData() {
  document.getElementById('import-input').click();
}

/** 가져오기 파일 처리 */
function handleElevenstImportFile(e) {
  const f = e.target.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      let data;

      // 새 형식: { _page: 'smartstore'|'coupang'|'elevenst', data: [...] }
      if (parsed && !Array.isArray(parsed) && parsed._page && parsed.data) {
        if (!ELEVENST_CONFIG.COMPATIBLE_PAGES.includes(parsed._page)) {
          showToast(ELEVENST_CONFIG.MESSAGES.IMPORT_WRONG_PAGE(parsed._page));
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
        title: ELEVENST_CONFIG.MESSAGES.IMPORT_TITLE,
        text: ELEVENST_CONFIG.MESSAGES.IMPORT_TEXT(elevenstState.cards.length),
        onConfirm: () => {
          elevenstState.cards = data;
          saveElevenst();
          renderElevenst();
          showToast(ELEVENST_CONFIG.MESSAGES.IMPORT_DONE(data.length));
        }
      });

      const cancelBtn = document.getElementById('modal-cancel');
      const onceHandler = () => {
        cancelBtn.removeEventListener('click', onceHandler);
        elevenstState.cards = elevenstState.cards.concat(data);
        saveElevenst();
        renderElevenst();
        showToast(ELEVENST_CONFIG.MESSAGES.IMPORT_ADDED(data.length));
      };
      cancelBtn.addEventListener('click', onceHandler, { once: true });
    } catch (err) {
      showToast(ELEVENST_CONFIG.MESSAGES.IMPORT_FAIL + err.message);
    }
  };
  r.readAsText(f);
  e.target.value = '';
}

/** 전체 삭제 */
function clearAllElevenst() {
  if (elevenstState.cards.length === 0) {
    showToast(ELEVENST_CONFIG.MESSAGES.NOTHING_DELETE);
    return;
  }
  showModal({
    title: ELEVENST_CONFIG.MESSAGES.CLEAR_TITLE,
    text: ELEVENST_CONFIG.MESSAGES.CLEAR_TEXT(elevenstState.cards.length),
    onConfirm: () => {
      elevenstState.cards = [];
      saveElevenst();
      renderElevenst();
      showToast(ELEVENST_CONFIG.MESSAGES.ALL_DELETED);
    }
  });
}

/** 개별 카드 삭제 확인 */
function confirmDeleteElevenst(cardId) {
  const card = findElevenstCard(cardId);
  if (!card) return;
  const label = card.name ? `"${card.name}"` : '이 상품';
  showModal({
    title: ELEVENST_CONFIG.MESSAGES.DELETE_TITLE,
    text: ELEVENST_CONFIG.MESSAGES.DELETE_TEXT(label),
    onConfirm: () => {
      elevenstState.cards = elevenstState.cards.filter(c => c.id !== cardId);
      saveElevenst();
      renderElevenst();
      showToast(ELEVENST_CONFIG.MESSAGES.DELETED);
    }
  });
}

/** 새 카드 추가 (보드 끝) */
function addElevenstCard() {
  const c = newElevenstCard();
  elevenstState.cards.push(c);
  saveElevenst();
  renderElevenst();
  scrollToElevenstCard(c.id);
}

/** 특정 카드 바로 뒤에 새 카드 추가 */
function addElevenstCardAfter(cardId) {
  const idx = findElevenstCardIndex(cardId);
  const c = newElevenstCard();
  if (idx < 0) {
    elevenstState.cards.push(c);
  } else {
    elevenstState.cards.splice(idx + 1, 0, c);
  }
  saveElevenst();
  renderElevenst();
  scrollToElevenstCard(c.id);
}

/** 카드로 부드러운 스크롤 */
function scrollToElevenstCard(cardId) {
  setTimeout(() => {
    const el = document.querySelector(`.smartstore-card[data-id="${cardId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
}

/** 복수품 항목 추가 */
function addBundleItem(cardId) {
  const card = findElevenstCard(cardId);
  if (!card) return;
  const item = newBundleItem();
  card.bundleItems.push(item);
  recalcElevenstCard(card);
  saveElevenst();
  renderElevenst();
  setTimeout(() => {
    const el = document.querySelector(`.smartstore-card[data-id="${cardId}"] .bundle-item[data-item-id="${item.id}"] input[name="itemSellerCode"]`);
    if (el) el.focus();
  }, 50);
}

/** 복수품 항목 삭제 */
function removeBundleItem(cardId, itemId) {
  const card = findElevenstCard(cardId);
  if (!card) return;
  card.bundleItems = card.bundleItems.filter(i => i.id !== itemId);
  // 항목이 모두 제거되면 단품 모드로 복귀
  if (card.bundleItems.length === 0) {
    card.isBundle = false;
  }
  recalcElevenstCard(card);
  saveElevenst();
  renderElevenst();
}
