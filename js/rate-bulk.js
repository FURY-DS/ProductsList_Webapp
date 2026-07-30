/* =====================================================
   rate-bulk.js - 환율 일괄 수정 모달
   ===================================================== */

let rateBulkModalEl = null;
let rateBulkEls = null;

/** 환율 일괄수정 모달 초기화 (DOM 로드 후 호출) */
function initRateBulk() {
  rateBulkModalEl = document.getElementById('rate-bulk-modal');
  rateBulkEls = {
    modal:       rateBulkModalEl,
    radios:      rateBulkModalEl.querySelectorAll('input[name="rate-mode"]'),
    absolute:    document.getElementById('rate-bulk-absolute'),
    multiplier:  document.getElementById('rate-bulk-multiplier'),
    scope:       document.getElementById('rate-bulk-scope'),
    preview:     document.getElementById('rate-bulk-preview'),
    previewCount: document.getElementById('preview-count'),
    previewBefore: document.getElementById('preview-before'),
    previewAfter: document.getElementById('preview-after'),
    absWrap:     document.getElementById('rate-input-absolute'),
    multWrap:    document.getElementById('rate-input-multiplier'),
    cancelBtn:   document.getElementById('rate-bulk-cancel'),
    applyBtn:    document.getElementById('rate-bulk-apply')
  };

  // 라디오 변경 시 입력 UI 토글 + 미리보기 갱신
  rateBulkEls.radios.forEach(r => {
    r.addEventListener('change', () => {
      updateRateBulkModeUI();
      updateRateBulkPreview();
    });
  });

  // 입력값 변경 시 미리보기 갱신
  rateBulkEls.absolute.addEventListener('input', updateRateBulkPreview);
  rateBulkEls.multiplier.addEventListener('input', updateRateBulkPreview);
  rateBulkEls.scope.addEventListener('change', updateRateBulkPreview);

  // 취소
  rateBulkEls.cancelBtn.addEventListener('click', closeRateBulkModal);
  // 배경 클릭 시 닫기
  rateBulkModalEl.addEventListener('click', (e) => {
    if (e.target === rateBulkModalEl) closeRateBulkModal();
  });
  // 적용
  rateBulkEls.applyBtn.addEventListener('click', applyRateBulk);
}

/** 헤더 버튼 클릭 시 호출 */
function openRateBulkModal() {
  if (!state.cards.length) {
    showToast('등록된 상품이 없어요');
    return;
  }
  // 초기화
  rateBulkEls.radios[0].checked = true;
  rateBulkEls.absolute.value = '';
  rateBulkEls.multiplier.value = '';
  rateBulkEls.scope.value = 'all';
  updateRateBulkModeUI();
  updateRateBulkPreview();
  rateBulkModalEl.classList.add('show');
}

/** 모달 닫기 */
function closeRateBulkModal() {
  rateBulkModalEl.classList.remove('show');
}

/** 라디오 모드에 따라 입력 UI 토글 */
function updateRateBulkModeUI() {
  const mode = getSelectedMode();
  rateBulkEls.absWrap.classList.toggle('hidden', mode !== 'absolute');
  rateBulkEls.multWrap.classList.toggle('hidden', mode !== 'multiplier');
}

/** 현재 선택된 모드 값 반환 */
function getSelectedMode() {
  for (const r of rateBulkEls.radios) {
    if (r.checked) return r.value;
  }
  return 'absolute';
}

/**
 * 적용 대상 카드 필터링
 * @returns {Array} 카드 배열
 */
function getTargetCards() {
  const scope = rateBulkEls.scope.value;
  if (scope === 'all') return state.cards;
  if (scope === 'filled') {
    return state.cards.filter(c => parseNum(c.rate) > 0);
  }
  if (scope === 'empty') {
    return state.cards.filter(c => !c.rate || parseNum(c.rate) === 0);
  }
  return state.cards;
}

/** 평균 계산 (대상 카드의 rate 평균) */
function averageRate(cards) {
  const values = cards.map(c => parseNum(c.rate)).filter(v => v > 0);
  if (!values.length) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

/** 미리보기 갱신 */
function updateRateBulkPreview() {
  const target = getTargetCards();
  const mode = getSelectedMode();
  const beforeAvg = averageRate(target);

  rateBulkEls.previewCount.textContent = `${target.length}개`;

  if (!target.length) {
    rateBulkEls.previewBefore.textContent = '-';
    rateBulkEls.previewAfter.textContent = '-';
    rateBulkEls.applyBtn.disabled = true;
    return;
  }
  rateBulkEls.applyBtn.disabled = false;

  // 변경 전 평균 표시
  rateBulkEls.previewBefore.textContent = beforeAvg > 0 ? formatNumber(round2(beforeAvg)) : '-';

  // 변경 후 평균 계산 (입력값이 있을 때만)
  let afterAvg = 0;
  if (mode === 'absolute') {
    const v = parseNum(rateBulkEls.absolute.value);
    afterAvg = v > 0 ? v : 0;
  } else {
    const m = parseNum(rateBulkEls.multiplier.value);
    afterAvg = m > 0 ? beforeAvg * m : 0;
  }
  rateBulkEls.previewAfter.textContent = afterAvg > 0 ? formatNumber(round2(afterAvg)) : '?';
}

/** 실제 일괄 적용 */
function applyRateBulk() {
  const mode = getSelectedMode();
  const target = getTargetCards();
  if (!target.length) {
    showToast('적용할 카드가 없어요');
    return;
  }

  let newValue = 0;
  let modeLabel = '';
  if (mode === 'absolute') {
    newValue = parseNum(rateBulkEls.absolute.value);
    if (newValue <= 0) {
      showToast('새 환율 값을 입력해 주세요');
      return;
    }
    modeLabel = `${formatNumber(newValue)}₩ 로 변경`;
  } else {
    newValue = parseNum(rateBulkEls.multiplier.value);
    if (newValue <= 0) {
      showToast('곱할 비율을 입력해 주세요');
      return;
    }
    modeLabel = `× ${newValue} 적용`;
  }

  // 적용
  target.forEach(c => {
    if (mode === 'absolute') {
      c.rate = String(newValue);
    } else {
      const old = parseNum(c.rate);
      if (old > 0) {
        c.rate = String(round4(old * newValue));
      }
    }
  });

  const result = save();
  closeRateBulkModal();
  render();
  reportSaveResult(result, CONFIG.MESSAGES, `${target.length}개 카드의 환율을 ${modeLabel}했어요`);
}