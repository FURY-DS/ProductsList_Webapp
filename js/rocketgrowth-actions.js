/* =====================================================
   rocketgrowth-actions.js - 로켓그로스 상단 액션 및 카드 동작
   ===================================================== */

/** 액션 버튼 초기화 */
function initRocketgrowthActions() {
  document.getElementById('btn-export').addEventListener('click', exportRocketgrowthData);
  document.getElementById('btn-import').addEventListener('click', importRocketgrowthData);
  document.getElementById('import-input').addEventListener('change', handleRocketgrowthImportFile);
  document.getElementById('btn-clear').addEventListener('click', clearAllRocketgrowth);
  document.getElementById('btn-bulk-fee').addEventListener('click', applyBulkFeeRocketgrowth);
  document.getElementById('bulk-fee-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); applyBulkFeeRocketgrowth(); }
  });
}

/** 판매수수료 전체 적용 */
function applyBulkFeeRocketgrowth() {
  const input = document.getElementById('bulk-fee-input');
  const value = input.value.trim();
  if (!value) { showToast('판매수수료 값을 입력해 주세요'); return; }
  if (rocketgrowthState.cards.length === 0) { showToast('등록된 상품이 없어요'); return; }
  showModal({
    title: '판매수수료 전체 적용',
    text: `모든 상품(${rocketgrowthState.cards.length}개)의 판매수수료를 '${value}'(으)로 변경할까요?`,
    confirmText: '적용',
    onConfirm: () => {
      rocketgrowthState.cards.forEach(c => { c.feeRate = value; recalcRocketgrowthCard(c); });
      const result = saveRocketgrowth();
      renderRocketgrowth();
      input.value = '';
      reportSaveResult(result, ROCKETGROWTH_CONFIG.MESSAGES, `전체 ${rocketgrowthState.cards.length}개 상품의 판매수수료가 '${value}'(으)로 변경되었어요`);
    }
  });
}

/** JSON 파일로 데이터보내기 */
function exportRocketgrowthData() {
  try {
    const exportData = { _page: ROCKETGROWTH_CONFIG.PAGE_ID, data: rocketgrowthState.cards };
    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `로켓그로스_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(ROCKETGROWTH_CONFIG.MESSAGES.EXPORT_DONE);
  } catch (err) {
    showToast(ROCKETGROWTH_CONFIG.MESSAGES.EXPORT_FAIL + err.message);
  }
}

/** 파일 선택 다이얼로그 열기 */
function importRocketgrowthData() {
  document.getElementById('import-input').click();
}

/** 가져오기 파일 처리 */
function handleRocketgrowthImportFile(e) {
  const f = e.target.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      let data;

      // 새 형식: { _page: 'rocketgrowth', data: [...] }
      if (parsed && !Array.isArray(parsed) && parsed._page && parsed.data) {
        if (parsed._page !== ROCKETGROWTH_CONFIG.PAGE_ID) {
          showToast(ROCKETGROWTH_CONFIG.MESSAGES.IMPORT_WRONG_PAGE(parsed._page));
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
        title: ROCKETGROWTH_CONFIG.MESSAGES.IMPORT_TITLE,
        text: ROCKETGROWTH_CONFIG.MESSAGES.IMPORT_TEXT(rocketgrowthState.cards.length),
        onConfirm: () => {
          rocketgrowthState.cards = data;
          const result = saveRocketgrowth();
          renderRocketgrowth();
          reportSaveResult(result, ROCKETGROWTH_CONFIG.MESSAGES, ROCKETGROWTH_CONFIG.MESSAGES.IMPORT_DONE(data.length));
        }
      });

      const cancelBtn = document.getElementById('modal-cancel');
      const onceHandler = () => {
        cancelBtn.removeEventListener('click', onceHandler);
        rocketgrowthState.cards = rocketgrowthState.cards.concat(data);
        const result = saveRocketgrowth();
        renderRocketgrowth();
        reportSaveResult(result, ROCKETGROWTH_CONFIG.MESSAGES, ROCKETGROWTH_CONFIG.MESSAGES.IMPORT_ADDED(data.length));
      };
      cancelBtn.addEventListener('click', onceHandler, { once: true });
    } catch (err) {
      showToast(ROCKETGROWTH_CONFIG.MESSAGES.IMPORT_FAIL + err.message);
    }
  };
  r.readAsText(f);
  e.target.value = '';
}

/** 전체 삭제 */
function clearAllRocketgrowth() {
  if (rocketgrowthState.cards.length === 0) {
    showToast(ROCKETGROWTH_CONFIG.MESSAGES.NOTHING_DELETE);
    return;
  }
  showModal({
    title: ROCKETGROWTH_CONFIG.MESSAGES.CLEAR_TITLE,
    text: ROCKETGROWTH_CONFIG.MESSAGES.CLEAR_TEXT(rocketgrowthState.cards.length),
    confirmText: '삭제',
    onConfirm: () => {
      rocketgrowthState.cards = [];
      const result = saveRocketgrowth();
      renderRocketgrowth();
      reportSaveResult(result, ROCKETGROWTH_CONFIG.MESSAGES, ROCKETGROWTH_CONFIG.MESSAGES.ALL_DELETED);
    }
  });
}

/** 개별 카드 삭제 확인 */
function confirmDeleteRocketgrowth(cardId) {
  const card = findRocketgrowthCard(cardId);
  if (!card) return;
  const label = card.name ? `"${card.name}"` : '이 상품';
  showModal({
    title: ROCKETGROWTH_CONFIG.MESSAGES.DELETE_TITLE,
    text: ROCKETGROWTH_CONFIG.MESSAGES.DELETE_TEXT(label),
    confirmText: '삭제',
    onConfirm: () => {
      rocketgrowthState.cards = rocketgrowthState.cards.filter(c => c.id !== cardId);
      const result = saveRocketgrowth();
      renderRocketgrowth();
      reportSaveResult(result, ROCKETGROWTH_CONFIG.MESSAGES, ROCKETGROWTH_CONFIG.MESSAGES.DELETED);
    }
  });
}

/** 새 카드 추가 (보드 끝) */
function addRocketgrowthCard() {
  const c = newRocketgrowthCard();
  rocketgrowthState.cards.push(c);
  reportSaveResult(saveRocketgrowth(), ROCKETGROWTH_CONFIG.MESSAGES);
  renderRocketgrowth();
  scrollToRocketgrowthCard(c.id);
}

/** 특정 카드 바로 뒤에 새 카드 추가 */
function addRocketgrowthCardAfter(cardId) {
  const idx = findRocketgrowthCardIndex(cardId);
  const c = newRocketgrowthCard();
  if (idx < 0) {
    rocketgrowthState.cards.push(c);
  } else {
    rocketgrowthState.cards.splice(idx + 1, 0, c);
  }
  reportSaveResult(saveRocketgrowth(), ROCKETGROWTH_CONFIG.MESSAGES);
  renderRocketgrowth();
  scrollToRocketgrowthCard(c.id);
}

/** 카드로 부드러운 스크롤 */
function scrollToRocketgrowthCard(cardId) {
  setTimeout(() => {
    const el = document.querySelector(`.smartstore-card[data-id="${cardId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
}

/** 복수품 항목 추가 */
function addRocketgrowthBundleItem(cardId) {
  const card = findRocketgrowthCard(cardId);
  if (!card) return;
  const item = newRocketgrowthBundleItem();
  card.bundleItems.push(item);
  recalcRocketgrowthCard(card);
  reportSaveResult(saveRocketgrowth(), ROCKETGROWTH_CONFIG.MESSAGES);
  renderRocketgrowth();
  setTimeout(() => {
    const el = document.querySelector(`.smartstore-card[data-id="${cardId}"] .bundle-item[data-item-id="${item.id}"] input[name="itemSellerCode"]`);
    if (el) el.focus();
  }, 50);
}

/** 복수품 항목 삭제 */
function removeRocketgrowthBundleItem(cardId, itemId) {
  const card = findRocketgrowthCard(cardId);
  if (!card) return;
  card.bundleItems = card.bundleItems.filter(i => i.id !== itemId);
  // 항목이 모두 제거되면 단품 모드로 복귀
  if (card.bundleItems.length === 0) {
    card.isBundle = false;
  }
  recalcRocketgrowthCard(card);
  reportSaveResult(saveRocketgrowth(), ROCKETGROWTH_CONFIG.MESSAGES);
  renderRocketgrowth();
}
