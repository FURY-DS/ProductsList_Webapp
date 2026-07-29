/* =====================================================
   smartstore-actions.js - 도매꾹 상단 액션 및 카드 동작
   ===================================================== */

/** 액션 버튼 초기화 */
function initDOMAGGUKActions() {
  document.getElementById('btn-export').addEventListener('click', exportDOMAGGUKData);
  document.getElementById('btn-import').addEventListener('click', importDOMAGGUKData);
  document.getElementById('import-input').addEventListener('change', handleDOMAGGUKImportFile);
  document.getElementById('btn-clear').addEventListener('click', clearAllDOMAGGUK);
  document.getElementById('btn-bulk-fee').addEventListener('click', applyBulkFeeDOMAGGUK);
  document.getElementById('bulk-fee-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); applyBulkFeeDOMAGGUK(); }
  });
}

/** 판매수수료 전체 적용 */
function applyBulkFeeDOMAGGUK() {
  const input = document.getElementById('bulk-fee-input');
  const value = input.value.trim();
  if (!value) { showToast('판매수수료 값을 입력해 주세요'); return; }
  if (domaggukState.cards.length === 0) { showToast('등록된 상품이 없어요'); return; }
  showModal({
    title: '판매수수료 전체 적용',
    text: `모든 상품(${domaggukState.cards.length}개)의 판매수수료를 '${value}'(으)로 변경할까요?`,
    confirmText: '적용',
    onConfirm: () => {
      domaggukState.cards.forEach(c => { c.feeRate = value; recalcDOMAGGUKCard(c); });
      const result = saveDOMAGGUK();
      renderDOMAGGUK();
      input.value = '';
      reportSaveResult(result, DOMAGGUK_CONFIG.MESSAGES, `전체 ${domaggukState.cards.length}개 상품의 판매수수료가 '${value}'(으)로 변경되었어요`);
    }
  });
}

/** JSON 파일로 데이터 내보내기 */
function exportDOMAGGUKData() {
  try {
    const exportData = { _page: DOMAGGUK_CONFIG.PAGE_ID, data: domaggukState.cards };
    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `도매꾹_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(DOMAGGUK_CONFIG.MESSAGES.EXPORT_DONE);
  } catch (err) {
    showToast(DOMAGGUK_CONFIG.MESSAGES.EXPORT_FAIL + err.message);
  }
}

/** 파일 선택 다이얼로그 열기 */
function importDOMAGGUKData() {
  document.getElementById('import-input').click();
}

/** 가져오기 파일 처리 */
function handleDOMAGGUKImportFile(e) {
  const f = e.target.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      let data;

      // 새 형식: { _page: 'smartstore'|'coupang'|'esm'|'elevenst', data: [...] }
      if (parsed && !Array.isArray(parsed) && parsed._page && parsed.data) {
        if (!DOMAGGUK_CONFIG.COMPATIBLE_PAGES.includes(parsed._page)) {
          showToast(DOMAGGUK_CONFIG.MESSAGES.IMPORT_WRONG_PAGE(parsed._page));
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
        title: DOMAGGUK_CONFIG.MESSAGES.IMPORT_TITLE,
        text: DOMAGGUK_CONFIG.MESSAGES.IMPORT_TEXT(domaggukState.cards.length),
        onConfirm: () => {
          domaggukState.cards = data;
          const result = saveDOMAGGUK();
          renderDOMAGGUK();
          reportSaveResult(result, DOMAGGUK_CONFIG.MESSAGES, DOMAGGUK_CONFIG.MESSAGES.IMPORT_DONE(data.length));
        }
      });

      const cancelBtn = document.getElementById('modal-cancel');
      const onceHandler = () => {
        cancelBtn.removeEventListener('click', onceHandler);
        domaggukState.cards = domaggukState.cards.concat(data);
        const result = saveDOMAGGUK();
        renderDOMAGGUK();
        reportSaveResult(result, DOMAGGUK_CONFIG.MESSAGES, DOMAGGUK_CONFIG.MESSAGES.IMPORT_ADDED(data.length));
      };
      cancelBtn.addEventListener('click', onceHandler, { once: true });
    } catch (err) {
      showToast(DOMAGGUK_CONFIG.MESSAGES.IMPORT_FAIL + err.message);
    }
  };
  r.readAsText(f);
  e.target.value = '';
}

/** 전체 삭제 */
function clearAllDOMAGGUK() {
  if (domaggukState.cards.length === 0) {
    showToast(DOMAGGUK_CONFIG.MESSAGES.NOTHING_DELETE);
    return;
  }
  showModal({
    title: DOMAGGUK_CONFIG.MESSAGES.CLEAR_TITLE,
    text: DOMAGGUK_CONFIG.MESSAGES.CLEAR_TEXT(domaggukState.cards.length),
    confirmText: '삭제',
    onConfirm: () => {
      domaggukState.cards = [];
      const result = saveDOMAGGUK();
      renderDOMAGGUK();
      reportSaveResult(result, DOMAGGUK_CONFIG.MESSAGES, DOMAGGUK_CONFIG.MESSAGES.ALL_DELETED);
    }
  });
}

/** 개별 카드 삭제 확인 */
function confirmDeleteDOMAGGUK(cardId) {
  const card = findDOMAGGUKCard(cardId);
  if (!card) return;
  const label = card.name ? `"${card.name}"` : '이 상품';
  showModal({
    title: DOMAGGUK_CONFIG.MESSAGES.DELETE_TITLE,
    text: DOMAGGUK_CONFIG.MESSAGES.DELETE_TEXT(label),
    confirmText: '삭제',
    onConfirm: () => {
      domaggukState.cards = domaggukState.cards.filter(c => c.id !== cardId);
      const result = saveDOMAGGUK();
      renderDOMAGGUK();
      reportSaveResult(result, DOMAGGUK_CONFIG.MESSAGES, DOMAGGUK_CONFIG.MESSAGES.DELETED);
    }
  });
}

/** 새 카드 추가 (보드 끝) */
function addDOMAGGUKCard() {
  const c = newDOMAGGUKCard();
  domaggukState.cards.push(c);
  reportSaveResult(saveDOMAGGUK(), DOMAGGUK_CONFIG.MESSAGES);
  renderDOMAGGUK();
  scrollToDOMAGGUKCard(c.id);
}

/** 특정 카드 바로 뒤에 새 카드 추가 */
function addDOMAGGUKCardAfter(cardId) {
  const idx = findDOMAGGUKCardIndex(cardId);
  const c = newDOMAGGUKCard();
  if (idx < 0) {
    domaggukState.cards.push(c);
  } else {
    domaggukState.cards.splice(idx + 1, 0, c);
  }
  reportSaveResult(saveDOMAGGUK(), DOMAGGUK_CONFIG.MESSAGES);
  renderDOMAGGUK();
  scrollToDOMAGGUKCard(c.id);
}

/** 카드로 부드러운 스크롤 */
function scrollToDOMAGGUKCard(cardId) {
  setTimeout(() => {
    const el = document.querySelector(`.domagguk-card[data-id="${cardId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
}

/** 복수품 항목 추가 */
function addBundleItem(cardId) {
  const card = findDOMAGGUKCard(cardId);
  if (!card) return;
  const item = newBundleItem();
  card.bundleItems.push(item);
  recalcDOMAGGUKCard(card);
  reportSaveResult(saveDOMAGGUK(), DOMAGGUK_CONFIG.MESSAGES);
  renderDOMAGGUK();
  setTimeout(() => {
    const el = document.querySelector(`.domagguk-card[data-id="${cardId}"] .bundle-item[data-item-id="${item.id}"] input[name="itemSellerCode"]`);
    if (el) el.focus();
  }, 50);
}

/** 복수품 항목 삭제 */
function removeBundleItem(cardId, itemId) {
  const card = findDOMAGGUKCard(cardId);
  if (!card) return;
  card.bundleItems = card.bundleItems.filter(i => i.id !== itemId);
  // 항목이 모두 제거되면 단품 모드로 복귀
  if (card.bundleItems.length === 0) {
    card.isBundle = false;
  }
  recalcDOMAGGUKCard(card);
  reportSaveResult(saveDOMAGGUK(), DOMAGGUK_CONFIG.MESSAGES);
  renderDOMAGGUK();
}
