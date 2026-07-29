/* =====================================================
   settlement-actions.js - 오픈마켓정산 이벤트 처리
   ===================================================== */

/** 콤마/마이너스를 제외하고 숫자로 변환 */
function parseMoneyInput(value) {
  if (value === undefined || value === null || value === '') return 0;
  const raw = String(value).replace(/,/g, '').trim();
  if (raw === '' || raw === '-') return 0;
  const num = parseFloat(raw);
  return isNaN(num) ? 0 : num;
}

/** 입력값을 포맷된 금액 문자열로 변환 */
function formatMoneyValue(value) {
  const num = parseMoneyInput(value);
  return formatNum(num);
}

/** input의 음수 클래스 갱신 */
function updateNegativeClass(input, value) {
  const num = parseMoneyInput(value);
  input.classList.toggle('negative', num < 0);
}

/** 메인 테이블 입력 처리 */
function handleSettlementInput(e) {
  const input = e.target;
  const rowId = input.dataset.row;
  const monthIdx = parseInt(input.dataset.month);

  if (!rowId || monthIdx === undefined) return;

  const m = settlementState.months[monthIdx];
  if (!m) return;

  if (input.classList.contains('money-input')) {
    const num = parseMoneyInput(input.value);
    m[rowId] = num;
  } else if (input.classList.contains('yn-input')) {
    m[rowId] = input.value.toUpperCase();
  } else if (input.classList.contains('note-textarea')) {
    // 비고는 계산에 영향을 주지 않으므로 recalc/render 없이 저장만
    m[rowId] = input.value;
    reportSaveResult(saveSettlement(), SETTLEMENT_CONFIG.MESSAGES);
    return;
  } else {
    m[rowId] = input.value;
  }

  recalcMonth(m);
  updateCalcCells(monthIdx);
  reportSaveResult(saveSettlement(), SETTLEMENT_CONFIG.MESSAGES);
}

/** 입력 필드 blur 시 콤마 포맷 적용 */
function handleSettlementBlur(e) {
  const input = e.target;
  if (!input.classList.contains('money-input')) return;
  input.value = formatMoneyValue(input.value);
  updateNegativeClass(input, input.value);
}

/** 입력 필드 focus 시 raw 값으로 복원 (소수점 2자리 이내) */
function handleSettlementFocus(e) {
  const input = e.target;
  if (!input.classList.contains('money-input')) return;
  const raw = parseMoneyInput(input.value);
  // 소수점 2자리 이내로 표시 (10+ 자리 방지)
  const rounded = Math.round(raw * 100) / 100;
  input.value = rounded === 0 ? '' : String(rounded);
  input.classList.remove('negative');
}

/** 일별 이익 입력 처리 */
function handleDailyInput(e) {
  const input = e.target;
  const day = parseInt(input.dataset.daily);
  const monthIdx = parseInt(input.dataset.month);

  if (!day || monthIdx === undefined) return;

  const m = settlementState.months[monthIdx];
  const fieldKey = SETTLEMENT_CONFIG.DAILY_FIELD_PREFIX + day;

  const num = parseMoneyInput(input.value);
  m[fieldKey] = num;

  recalcMonth(m);
  updateCalcCells(monthIdx);
  updateDailySumRow(monthIdx);
  reportSaveResult(saveSettlement(), SETTLEMENT_CONFIG.MESSAGES);
}

/** 일별 입력 필드 blur 시 콤마 포맷 적용 */
function handleDailyBlur(e) {
  const input = e.target;
  input.value = formatMoneyValue(input.value);
  updateNegativeClass(input, input.value);
}

/** 일별 입력 필드 focus 시 raw 값으로 복원 (소수점 2자리 이내) */
function handleDailyFocus(e) {
  const input = e.target;
  const raw = parseMoneyInput(input.value);
  const rounded = Math.round(raw * 100) / 100;
  input.value = rounded === 0 ? '' : String(rounded);
  input.classList.remove('negative');
}

/** 해당 월의 calc 셀만 업데이트 (전체 re-render 방지) */
function updateCalcCells(monthIdx) {
  const m = settlementState.months[monthIdx];
  SETTLEMENT_CONFIG.ROWS.forEach(row => {
    if (row.type === 'calc') {
      const cell = settlementTableEl.querySelector(`tr[data-row="${row.id}"] td:nth-child(${monthIdx + 2})`);
      if (cell) {
        const val = m[row.id];
        cell.className = 'month-col';
        if (row.plainCalc) {
          cell.className += ' cell-plain-calc';
          if (val === 0) cell.className += ' zero-val';
          if (val < 0) cell.className += ' negative';
          cell.innerHTML = `<span class="plain-calc-value ${val < 0 ? 'negative' : ''}">${formatNum(val)}</span>`;
        } else {
          cell.className += ' cell-calc';
          if (row.id === 'finalIncome') {
            cell.className += val > 0 ? ' result-positive' : (val < 0 ? ' result-negative' : '');
          } else if (val < 0) {
            cell.className += ' negative';
          }
          if (val === 0) cell.className += ' zero-val';
          cell.textContent = formatNum(val);
        }
      }
    }
  });
}

/** 일별 합계 행 업데이트 */
function updateDailySumRow(monthIdx) {
  const sumRow = dailyTableEl.querySelector('tbody tr:last-child td:nth-child(' + (monthIdx + 2) + ')');
  if (sumRow) {
    const sum = settlementState.months[monthIdx]._nyDailySum;
    sumRow.textContent = formatNum(sum);
    sumRow.className = 'month-col cell-calc ' + (sum < 0 ? 'result-negative' : 'result-positive');
  }
}

/** 일별 섹션 펼치기/숨기기 */
function toggleDailySection() {
  settlementState.dailyExpanded = !settlementState.dailyExpanded;
  dailyWrapEl.classList.toggle('collapsed', !settlementState.dailyExpanded);
  dailyToggleEl.classList.toggle('open', settlementState.dailyExpanded);
}

/** JSON 내보내기 */
function exportSettlement() {
  try {
    const data = {
      pageId: SETTLEMENT_CONFIG.PAGE_ID,
      year: settlementState.year,
      months: settlementState.months,
      exportedAt: new Date().toISOString()
    };
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `오픈마켓정산_${settlementState.year}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(SETTLEMENT_CONFIG.MESSAGES.EXPORT_DONE);
  } catch (e) {
    showToast(SETTLEMENT_CONFIG.MESSAGES.EXPORT_FAIL + e.message);
  }
}

/** JSON 가져오기 */
function importSettlement() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.pageId && data.pageId !== SETTLEMENT_CONFIG.PAGE_ID) {
          showToast(SETTLEMENT_CONFIG.MESSAGES.IMPORT_WRONG_PAGE(data.pageId));
          return;
        }
        if (!data.months || !Array.isArray(data.months)) {
          showToast(SETTLEMENT_CONFIG.MESSAGES.IMPORT_FAIL + '잘못된 데이터 형식');
          return;
        }

        settlementState.year = data.year || new Date().getFullYear();
        settlementState.months = data.months.map(m => {
          const defaultMonth = SETTLEMENT_CONFIG.DEFAULT_MONTH();
          Object.keys(defaultMonth).forEach(k => {
            if (m[k] === undefined) m[k] = defaultMonth[k];
          });
          return m;
        });
        recalcAll();
        renderSettlement();
        const yearSelect = document.getElementById('year-select');
        if (yearSelect) yearSelect.value = settlementState.year;
        reportSaveResult(saveSettlement(), SETTLEMENT_CONFIG.MESSAGES, SETTLEMENT_CONFIG.MESSAGES.IMPORT_DONE);
      } catch (err) {
        showToast(SETTLEMENT_CONFIG.MESSAGES.IMPORT_FAIL + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

/** 현재 연도 초기화 */
function clearSettlement() {
  showModal({
    title: `${settlementState.year}년 초기화`,
    text: `${settlementState.year}년 정산 데이터를 초기화할까요?\n이 작업은 되돌릴 수 없어요.`,
    confirmText: '초기화',
    onConfirm: () => {
      initEmptyMonths();
      renderSettlement();
      reportSaveResult(saveSettlement(), SETTLEMENT_CONFIG.MESSAGES, SETTLEMENT_CONFIG.MESSAGES.SAVED);
    }
  });
}

/** 연도 변경 (다년도 데이터 안전 전환) */
function changeSettlementYear(newYear) {
  // 1. 현재 연도 데이터 저장
  saveSettlement();
  // 2. 연도 전환
  settlementState.year = newYear;
  // 3. 새 연도 데이터 로드 (없으면 빈 months 생성)
  const months = loadYearData(newYear);
  if (months) {
    settlementState.months = months;
  } else {
    initEmptyMonths();
  }
  recalcAll();
  // 4. UI 갱신
  renderSettlement();
  const yearSelect = document.getElementById('year-select');
  if (yearSelect) yearSelect.value = newYear;
  // 5. currentYear 갱신 저장
  saveSettlement();
}
