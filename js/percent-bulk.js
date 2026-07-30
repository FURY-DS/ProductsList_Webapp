/* =====================================================
   percent-bulk.js - 퍼센트 일괄 수정 모달
   ===================================================== */

let pctBulkModalEl = null;
let pctBulkEls = null;

/** 퍼센트 일괄수정 모달 초기화 (DOM 로드 후 호출) */
function initPercentBulk() {
  pctBulkModalEl = document.getElementById('percent-bulk-modal');
  pctBulkEls = {
    modal:        pctBulkModalEl,
    radios:       pctBulkModalEl.querySelectorAll('input[name="pct-mode"]'),
    absolute:     document.getElementById('percent-bulk-absolute'),
    multiplier:   document.getElementById('percent-bulk-multiplier'),
    scope:        document.getElementById('percent-bulk-scope'),
    preview:      document.getElementById('percent-bulk-preview'),
    previewCount: document.getElementById('pct-preview-count'),
    previewBefore:document.getElementById('pct-preview-before'),
    previewAfter: document.getElementById('pct-preview-after'),
    absWrap:      document.getElementById('pct-input-absolute'),
    multWrap:     document.getElementById('pct-input-multiplier'),
    cancelBtn:    document.getElementById('percent-bulk-cancel'),
    applyBtn:     document.getElementById('percent-bulk-apply')
  };

  // 라디오 변경 시 입력 UI 토글 + 미리보기 갱신
  pctBulkEls.radios.forEach(r => {
    r.addEventListener('change', () => {
      updatePctBulkModeUI();
      updatePctBulkPreview();
    });
  });

  // 입력값 변경 시 미리보기 갱신
  pctBulkEls.absolute.addEventListener('input', updatePctBulkPreview);
  pctBulkEls.multiplier.addEventListener('input', updatePctBulkPreview);
  pctBulkEls.scope.addEventListener('change', updatePctBulkPreview);

  // 취소
  pctBulkEls.cancelBtn.addEventListener('click', closePctBulkModal);
  // 배경 클릭 시 닫기
  pctBulkModalEl.addEventListener('click', (e) => {
    if (e.target === pctBulkModalEl) closePctBulkModal();
  });
  // 적용
  pctBulkEls.applyBtn.addEventListener('click', applyPctBulk);
}

/** 헤더 버튼 클릭 시 호출 */
function openPctBulkModal() {
  if (!state.cards.length) {
    showToast('등록된 상품이 없어요');
    return;
  }
  // 초기화
  pctBulkEls.radios[0].checked = true;
  pctBulkEls.absolute.value = '';
  pctBulkEls.multiplier.value = '';
  pctBulkEls.scope.value = 'all';
  updatePctBulkModeUI();
  updatePctBulkPreview();
  pctBulkModalEl.classList.add('show');
}

/** 모달 닫기 */
function closePctBulkModal() {
  pctBulkModalEl.classList.remove('show');
}

/** 라디오 모드에 따라 입력 UI 토글 */
function updatePctBulkModeUI() {
  const mode = getPctSelectedMode();
  pctBulkEls.absWrap.classList.toggle('hidden', mode !== 'absolute');
  pctBulkEls.multWrap.classList.toggle('hidden', mode !== 'multiplier');
}

/** 현재 선택된 모드 값 반환 */
function getPctSelectedMode() {
  for (const r of pctBulkEls.radios) {
    if (r.checked) return r.value;
  }
  return 'absolute';
}

/**
 * 적용 대상 카드 필터링
 * @returns {Array} 카드 배열
 */
function getPctTargetCards() {
  const scope = pctBulkEls.scope.value;
  if (scope === 'all') return state.cards;
  if (scope === 'filled') {
    return state.cards.filter(c => parseNum(c.percent) > 0);
  }
  if (scope === 'empty') {
    return state.cards.filter(c => !c.percent || parseNum(c.percent) === 0);
  }
  return state.cards;
}

/** 평균 계산 (대상 카드의 percent 평균) */
function averagePercent(cards) {
  const values = cards.map(c => parseNum(c.percent)).filter(v => v > 0);
  if (!values.length) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

/** 미리보기 갱신 */
function updatePctBulkPreview() {
  const target = getPctTargetCards();
  const mode = getPctSelectedMode();
  const beforeAvg = averagePercent(target);

  pctBulkEls.previewCount.textContent = `${target.length}개`;

  if (!target.length) {
    pctBulkEls.previewBefore.textContent = '-';
    pctBulkEls.previewAfter.textContent = '-';
    pctBulkEls.applyBtn.disabled = true;
    return;
  }
  pctBulkEls.applyBtn.disabled = false;

  // 변경 전 평균 표시
  pctBulkEls.previewBefore.textContent = beforeAvg > 0 ? round4(beforeAvg).toString() : '-';

  // 변경 후 평균 계산 (입력값이 있을 때만)
  let afterAvg = 0;
  if (mode === 'absolute') {
    const v = parseNum(pctBulkEls.absolute.value);
    afterAvg = v > 0 ? v : 0;
  } else {
    const m = parseNum(pctBulkEls.multiplier.value);
    afterAvg = m > 0 ? beforeAvg * m : 0;
  }
  pctBulkEls.previewAfter.textContent = afterAvg > 0 ? round4(afterAvg).toString() : '?';
}

/** 실제 일괄 적용 */
function applyPctBulk() {
  const mode = getPctSelectedMode();
  const target = getPctTargetCards();
  if (!target.length) {
    showToast('적용할 카드가 없어요');
    return;
  }

  let newValue = 0;
  let modeLabel = '';
  if (mode === 'absolute') {
    newValue = parseNum(pctBulkEls.absolute.value);
    if (newValue <= 0) {
      showToast('새 퍼센트 값을 입력해 주세요');
      return;
    }
    modeLabel = `${round4(newValue)} 로 변경`;
  } else {
    newValue = parseNum(pctBulkEls.multiplier.value);
    if (newValue <= 0) {
      showToast('곱할 비율을 입력해 주세요');
      return;
    }
    modeLabel = `× ${newValue} 적용`;
  }

  // 적용
  target.forEach(c => {
    if (mode === 'absolute') {
      c.percent = String(round4(newValue));
    } else {
      const old = parseNum(c.percent);
      if (old > 0) {
        c.percent = String(round4(old * newValue));
      }
    }
  });

  const result = save();
  closePctBulkModal();
  render();
  reportSaveResult(result, CONFIG.MESSAGES, `${target.length}개 카드의 퍼센트를 ${modeLabel}했어요`);
}
