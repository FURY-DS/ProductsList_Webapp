/* =====================================================
   elevenst-actions.js - 11번가 상단 액션 및 카드 동작
   ===================================================== */

/** 액션 버튼 초기화 */
function initElevenstActions() {
  document.getElementById('btn-export').addEventListener('click', exportElevenstData);
  document.getElementById('btn-import').addEventListener('click', importElevenstData);
  document.getElementById('import-input').addEventListener('change', handleElevenstImportFile);
  document.getElementById('btn-clear').addEventListener('click', clearAllElevenst);
  document.getElementById('btn-bulk-fee').addEventListener('click', applyBulkFeeElevenst);
  document.getElementById('btn-bulk-cost').addEventListener('click', openBulkCostModalElevenst);
  document.getElementById('bulk-fee-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); applyBulkFeeElevenst(); }
  });
}

/** 판매수수료 전체 적용 */
function applyBulkFeeElevenst() {
  const input = document.getElementById('bulk-fee-input');
  const value = input.value.trim();
  if (!value) { showToast('판매수수료 값을 입력해 주세요'); return; }
  if (elevenstState.cards.length === 0) { showToast('등록된 상품이 없어요'); return; }
  showModal({
    title: '판매수수료 전체 적용',
    text: `모든 상품(${elevenstState.cards.length}개)의 판매수수료를 '${value}'(으)로 변경할까요?`,
    confirmText: '적용',
    onConfirm: () => {
      elevenstState.cards.forEach(c => { c.feeRate = value; recalcElevenstCard(c); });
      const result = saveElevenst();
      renderElevenst();
      input.value = '';
      reportSaveResult(result, ELEVENST_CONFIG.MESSAGES, `전체 ${elevenstState.cards.length}개 상품의 판매수수료가 '${value}'(으)로 변경되었어요`);
    }
  });
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
          const result = saveElevenst();
          renderElevenst();
          reportSaveResult(result, ELEVENST_CONFIG.MESSAGES, ELEVENST_CONFIG.MESSAGES.IMPORT_DONE(data.length));
        }
      });

      const cancelBtn = document.getElementById('modal-cancel');
      const onceHandler = () => {
        cancelBtn.removeEventListener('click', onceHandler);
        elevenstState.cards = elevenstState.cards.concat(data);
        const result = saveElevenst();
        renderElevenst();
        reportSaveResult(result, ELEVENST_CONFIG.MESSAGES, ELEVENST_CONFIG.MESSAGES.IMPORT_ADDED(data.length));
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
    confirmText: '삭제',
    onConfirm: () => {
      elevenstState.cards = [];
      const result = saveElevenst();
      renderElevenst();
      reportSaveResult(result, ELEVENST_CONFIG.MESSAGES, ELEVENST_CONFIG.MESSAGES.ALL_DELETED);
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
    confirmText: '삭제',
    onConfirm: () => {
      elevenstState.cards = elevenstState.cards.filter(c => c.id !== cardId);
      const result = saveElevenst();
      renderElevenst();
      reportSaveResult(result, ELEVENST_CONFIG.MESSAGES, ELEVENST_CONFIG.MESSAGES.DELETED);
    }
  });
}

/** 새 카드 추가 (보드 끝) */
function addElevenstCard() {
  const c = newElevenstCard();
  elevenstState.cards.push(c);
  reportSaveResult(saveElevenst(), ELEVENST_CONFIG.MESSAGES);
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
  reportSaveResult(saveElevenst(), ELEVENST_CONFIG.MESSAGES);
  renderElevenst();
  scrollToElevenstCard(c.id);
}

/** 카드로 부드러운 스크롤 */
function scrollToElevenstCard(cardId) {
  setTimeout(() => {
    const el = document.querySelector(`.product-card[data-id="${cardId}"]`);
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
  reportSaveResult(saveElevenst(), ELEVENST_CONFIG.MESSAGES);
  renderElevenst();
  setTimeout(() => {
    const el = document.querySelector(`.product-card[data-id="${cardId}"] .bundle-item[data-item-id="${item.id}"] input[name="itemSellerCode"]`);
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
  reportSaveResult(saveElevenst(), ELEVENST_CONFIG.MESSAGES);
  renderElevenst();
}


/* =====================================================
   비용 전체입력 (창고택배비/마켓택배비)
   - 판매수수료 전체입력 바의 '비용 전체입력' 버튼 → 모달에서 2개 항목 입력
   - 입력한 항목만 모든 카드에 일괄 적용 (비워둔 항목은 변경 안 함)
   - N배송 페이지의 동일 기능(5개 항목)과 동일 패턴, 항목만 2개로 축소
   ===================================================== */

// 전체입력 대상 비용 필드 (key = 카드 데이터 필드, label = 모달 표시명)
const BULK_COST_FIELDS_Elevenst = [
  { key: 'warehouseFee', label: '창고택배비' },
  { key: 'marketFee',    label: '마켓택배비' }
];

let _bulkCostOverlayEl_Elevenst = null;

/** 비용 전체입력 모달 닫기 */
function closeBulkCostModalElevenst() {
  if (_bulkCostOverlayEl_Elevenst) {
    _bulkCostOverlayEl_Elevenst.remove();
    _bulkCostOverlayEl_Elevenst = null;
  }
}

/** 비용 2개 항목 전체입력 모달 열기 */
function openBulkCostModalElevenst() {
  if (elevenstState.cards.length === 0) { showToast('등록된 상품이 없어요'); return; }
  closeBulkCostModalElevenst();

  // 2개 입력 행 생성 (placeholder는 config의 필드 정의에서 재사용)
  let rowsHtml = '';
  BULK_COST_FIELDS_Elevenst.forEach(f => {
    const ph = (ELEVENST_CONFIG.FIELDS[f.key] && ELEVENST_CONFIG.FIELDS[f.key].placeholder) || '';
    rowsHtml +=
      '<label class="bulk-cost-row">' +
        '<span class="bulk-cost-row-label">' + f.label + '</span>' +
        '<input type="number" step="any" class="bulk-cost-input" data-key="' + f.key + '" placeholder="' + ph + '" />' +
      '</label>';
  });

  const overlay = document.createElement('div');
  overlay.className = 'bulk-cost-overlay';
  overlay.innerHTML =
    '<div class="bulk-cost-modal">' +
      '<h3 class="bulk-cost-title">비용 전체입력</h3>' +
      '<p class="bulk-cost-desc">모든 상품(' + elevenstState.cards.length + '개)에 일괄 적용할 비용을 입력하세요.<br>비워둔 항목은 변경하지 않아요.</p>' +
      '<div class="bulk-cost-body">' + rowsHtml + '</div>' +
      '<div class="bulk-cost-actions">' +
        '<button type="button" class="bulk-cost-btn bulk-cost-btn-cancel" id="bulk-cost-cancel-Elevenst">취소</button>' +
        '<button type="button" class="bulk-cost-btn bulk-cost-btn-apply" id="bulk-cost-apply-Elevenst">적용</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  _bulkCostOverlayEl_Elevenst = overlay;

  overlay.querySelector('#bulk-cost-cancel-Elevenst').addEventListener('click', closeBulkCostModalElevenst);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeBulkCostModalElevenst();
  });

  overlay.querySelector('#bulk-cost-apply-Elevenst').addEventListener('click', () => {
    // 입력된(비어 있지 않은) 항목만 수집
    const values = {};
    let filled = 0;
    overlay.querySelectorAll('.bulk-cost-input').forEach(inp => {
      const v = inp.value.trim();
      if (v !== '') { values[inp.dataset.key] = v; filled++; }
    });
    if (filled === 0) { showToast('입력한 비용이 없어요'); return; }

    const summary = BULK_COST_FIELDS_Elevenst
      .filter(f => values[f.key] !== undefined)
      .map(f => f.label + ' ' + values[f.key] + '원')
      .join(', ');

    closeBulkCostModalElevenst();
    showModal({
      title: '비용 전체 적용',
      text: '모든 상품(' + elevenstState.cards.length + '개)에\n' + summary + '을(를) 일괄 적용할까요?',
      confirmText: '적용',
      onConfirm: () => {
        elevenstState.cards.forEach(c => {
          Object.keys(values).forEach(key => { c[key] = values[key]; });
          recalcElevenstCard(c);
        });
        const result = saveElevenst();
        renderElevenst();
        reportSaveResult(result, ELEVENST_CONFIG.MESSAGES,
          '전체 ' + elevenstState.cards.length + '개 상품의 비용 ' + filled + '개 항목이 변경되었어요');
      }
    });
  });
}
