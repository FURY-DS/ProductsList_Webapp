/* =====================================================
   settlement-render.js - 오픈마켓정산 테이블 렌더링
   ===================================================== */

let settlementTableEl = null;
let settlementScrollEl = null;
let dailyTableEl = null;
let dailyWrapEl = null;
let dailyToggleEl = null;

/** 초기 DOM 참조 */
function initSettlementRender() {
  settlementTableEl = document.getElementById('settlement-table');
  settlementScrollEl = document.getElementById('settlement-scroll');
  dailyTableEl = document.getElementById('daily-table');
  dailyWrapEl = document.getElementById('daily-wrap');
  dailyToggleEl = document.getElementById('daily-toggle');
}

/** 메인 정산 테이블 렌더 */
function renderSettlement() {
  const rows = SETTLEMENT_CONFIG.ROWS;
  const months = settlementState.months;
  const monthLabels = SETTLEMENT_CONFIG.MONTHS;
  let currentSection = '';

  let html = '<thead><tr>';
  html += '<th class="row-label" style="width:260px;">항목</th>';
  for (let i = 0; i < 12; i++) {
    html += `<th class="month-col">${monthLabels[i]}</th>`;
  }
  html += '</tr></thead>';

  html += '<tbody>';
  rows.forEach(row => {
    // 섹션 헤더 행
    if (row.section !== currentSection) {
      currentSection = row.section;
      const sec = SETTLEMENT_CONFIG.SECTIONS.find(s => s.id === row.section);
      if (sec) {
        html += `<tr><td colspan="13" class="row-label section-header">${sec.label}</td></tr>`;
      }
    }

    let labelClass = 'row-label';
    if (row.id === 'finalIncome') labelClass += ' result-label';
    if (row.id === 'totalExpense') labelClass += ' loss-label';

    html += `<tr data-row="${row.id}">`;
    html += `<td class="${labelClass}">${row.label}</td>`;

    for (let mi = 0; mi < 12; mi++) {
      const m = months[mi];
      const val = m[row.id];
      let cellClass = 'month-col';
      let cellContent = '';

      if (row.type === 'calc') {
        if (row.plainCalc) {
          // 입력 행과 동일한 디자인 (중간 계산값)
          cellClass += ' cell-plain-calc';
          if (val === 0) cellClass += ' zero-val';
          if (val < 0) cellClass += ' negative';
          cellContent = `<span class="plain-calc-value ${val < 0 ? 'negative' : ''}">${formatNum(val)}</span>`;
        } else {
          cellClass += ' cell-calc';
          if (row.id === 'finalIncome') {
            cellClass += val > 0 ? ' result-positive' : (val < 0 ? ' result-negative' : '');
          } else if (val < 0) {
            cellClass += ' negative';
          }
          if (val === 0) cellClass += ' zero-val';
          cellContent = formatNum(val);
        }
      } else if (row.type === 'yn') {
        cellContent = `<input class="cell-input yn-input" type="text" data-row="${row.id}" data-month="${mi}" value="${escapeAttr(val || 'Y')}" maxlength="1" />`;
      } else if (row.type === 'input') {
        const fmt = escapeAttr(formatNum(val ?? 0));
        const negClass = (val < 0) ? ' negative' : '';
        cellContent = `<input class="cell-input money-input${negClass}" type="text" inputmode="numeric" data-row="${row.id}" data-month="${mi}" value="${fmt}" placeholder="0" />`;
      } else if (row.type === 'note') {
        // 비고 행: 1월~12월 각 칸에 메모 입력
        cellClass += ' note-month-cell';
        cellContent = `<textarea class="cell-input note-textarea" data-row="${row.id}" data-month="${mi}" placeholder="메모...">${escapeAttr(val || '')}</textarea>`;
      } else if (row.type === 'text') {
        cellContent = `<input class="cell-input text-input note-input" type="text" data-row="${row.id}" data-month="${mi}" value="${escapeAttr(val || '')}" placeholder="메모..." />`;
      } else {
        cellContent = '';
      }

      html += `<td class="${cellClass}">${cellContent}</td>`;
    }

    html += '</tr>';
  });
  html += '</tbody>';

  settlementTableEl.innerHTML = html;

  // 이벤트 바인딩
  settlementTableEl.querySelectorAll('.cell-input').forEach(input => {
    input.addEventListener('input', handleSettlementInput);
    input.addEventListener('change', handleSettlementInput);
    input.addEventListener('focus', handleSettlementFocus);
    input.addEventListener('blur', handleSettlementBlur);
  });

  // 비고 월별 셀: 셀 클릭 시 textarea 포커스
  settlementTableEl.querySelectorAll('td.note-month-cell').forEach(td => {
    td.addEventListener('click', (e) => {
      if (e.target.tagName !== 'TEXTAREA') {
        const ta = td.querySelector('textarea');
        if (ta) ta.focus();
      }
    });
  });

  // 비고 textarea: 포커스 시 확장, blur 시 축소
  settlementTableEl.querySelectorAll('textarea.note-textarea').forEach(ta => {
    ta.addEventListener('focus', () => {
      ta.classList.add('expanded');
      ta.parentElement.classList.add('expanded');
    });
    ta.addEventListener('blur', () => {
      ta.classList.remove('expanded');
      ta.parentElement.classList.remove('expanded');
    });
  });

  renderDailyTable();
}

/** 일별 이익 테이블 렌더 */
function renderDailyTable() {
  const months = settlementState.months;
  const monthLabels = SETTLEMENT_CONFIG.MONTHS;
  const prefix = SETTLEMENT_CONFIG.DAILY_FIELD_PREFIX;
  const days = SETTLEMENT_CONFIG.DAILY_ROWS;

  let html = '<thead><tr>';
  html += '<th class="row-label" style="width:260px;">일별 이익</th>';
  for (let i = 0; i < 12; i++) {
    html += `<th class="month-col">${monthLabels[i]}</th>`;
  }
  html += '</tr></thead>';

  html += '<tbody>';
  for (let d = 1; d <= days; d++) {
    const label = SETTLEMENT_CONFIG.DAILY_LABEL_PREFIX + d;
    html += `<tr data-daily="${d}">`;
    html += `<td class="row-label">${label}</td>`;

    for (let mi = 0; mi < 12; mi++) {
      const val = months[mi][prefix + d];
      const dailyFmt = escapeAttr(formatNum(val ?? 0));
      const dailyNegClass = (val < 0) ? ' negative' : '';
      html += `<td class="month-col"><input class="cell-input money-input${dailyNegClass}" type="text" inputmode="numeric" data-daily="${d}" data-month="${mi}" value="${dailyFmt}" placeholder="0" /></td>`;
    }

    html += '</tr>';
  }

  // 합계 행
  html += '<tr>';
  html += '<td class="row-label result-label">일별 합계 (= 엔와이 정산금)</td>';
  for (let mi = 0; mi < 12; mi++) {
    const sum = months[mi]._nyDailySum;
    const sumClass = sum < 0 ? 'cell-calc result-negative' : 'cell-calc result-positive';
    html += `<td class="month-col ${sumClass}">${formatNum(sum)}</td>`;
  }
  html += '</tr>';

  html += '</tbody>';
  dailyTableEl.innerHTML = html;

  // 이벤트 바인딩
  dailyTableEl.querySelectorAll('.cell-input').forEach(input => {
    input.addEventListener('input', handleDailyInput);
    input.addEventListener('change', handleDailyInput);
    input.addEventListener('focus', handleDailyFocus);
    input.addEventListener('blur', handleDailyBlur);
  });

  // 펼치기/숨기기 상태 적용
  if (!settlementState.dailyExpanded) {
    dailyWrapEl.classList.add('collapsed');
  }
}

/** 숫자 포맷 (₩) - 소수점 최대 2자리 */
function formatNum(val) {
  if (val === 0 || val === null || val === undefined) return '0';
  if (typeof val !== 'number') return val;
  return val.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}
