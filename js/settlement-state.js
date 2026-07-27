/* =====================================================
   settlement-state.js - 오픈마켓정산 상태 관리
   ===================================================== */

const settlementState = {
  // 12개월 데이터 배열 [1월~12월]
  months: [],

  // 현재 선택 연도
  year: new Date().getFullYear(),

  // 일별 섹션 펼치기/숨기기 상태
  dailyExpanded: true
};

/** 일별 이익 합산 (엔와이 정산금) */
function calcNyDailySum(monthData) {
  let sum = 0;
  for (let d = 1; d <= SETTLEMENT_CONFIG.DAILY_ROWS; d++) {
    const val = monthData[SETTLEMENT_CONFIG.DAILY_FIELD_PREFIX + d];
    if (typeof val === 'number') sum += val;
  }
  monthData._nyDailySum = sum;
  return sum;
}

/** 특정 월의 모든 calc 행 재계산 */
function recalcMonth(monthData) {
  calcNyDailySum(monthData);
  SETTLEMENT_CONFIG.ROWS.forEach(row => {
    if (row.type === 'calc') {
      monthData[row.id] = row.formula(monthData);
    }
  });
}

/** 전체 12개월 재계산 */
function recalcAll() {
  settlementState.months.forEach(m => recalcMonth(m));
}
