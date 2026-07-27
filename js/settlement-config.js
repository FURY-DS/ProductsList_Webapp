/* =====================================================
   settlement-config.js - 오픈마켓정산 설정
   ===================================================== */

const SETTLEMENT_CONFIG = {
  PAGE_ID: 'settlement',
  STORAGE_KEY: 'settlement_v1',
  PAGE_TITLE: '오픈마켓정산',
  PAGE_HEADER: '오픈마켓정산',

  TOAST_DURATION: 1800,

  // 월 라벨
  MONTHS: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],

  // 행 정의: id, label, type(input/calc), formula(calc일 때), section, note
  // type: 'input' = 사용자 직접 입력, 'calc' = 자동 계산, 'yn' = Y/N, 'text' = 텍스트
  ROWS: [
    // === 수입/매출 섹션 ===
    { id: 'nyParcel',     label: '엔와이풀필먼트 택배 개수',         type: 'input',  section: 'info' },
    { id: 'nyNship',      label: '엔와이-N배송 택배 개수',           type: 'input',  section: 'info' },
    { id: 'taxCount',     label: '전자세금계산서 발행 건수',         type: 'input',  section: 'info' },
    { id: 'taxSales',     label: '전자세금계산서 매출',              type: 'input',  section: 'income' },
    { id: 'onlineSales',  label: '온라인 매출',                      type: 'input',  section: 'income' },
    { id: 'totalSales',   label: '총합매출',                         type: 'calc',   section: 'income',
      formula: (m) => m.taxSales + m.onlineSales },
    { id: 'taxProfit',    label: '전자세금계산서 매출이익',           type: 'input',  section: 'profit' },
    { id: 'nyProfit',     label: '엔와이-한국오픈마켓\n정산금(이익)', type: 'calc',   section: 'profit',
      formula: (m) => m._nyDailySum, plainCalc: true },
    { id: 'wikipProfit',  label: '위킵-한국오픈마켓\n정산금(이익)',   type: 'input',  section: 'profit' },
    { id: 'rocketProfit', label: '쿠팡로켓그로스\n정산금(이익)',      type: 'input',  section: 'profit' },
    { id: 'rocketCheck',  label: '쿠팡로켓그로스\n작업+발송 비용 확인(Y/N)', type: 'yn', section: 'profit' },
    { id: 'totalProfit',  label: '총합 이익',                        type: 'calc',   section: 'profit',
      formula: (m) => m.nyProfit + m.rocketProfit + m.taxProfit + m.wikipProfit },
    // === 지출 섹션 ===
    { id: 'loanPrincipal', label: '대출 원금',                      type: 'input',  section: 'expense' },
    { id: 'loanInterest',  label: '대출 이자',                      type: 'input',  section: 'expense' },
    { id: 'logistics',     label: '물류비(창고+택배+기타)\n- 로켓 제외 (수량+비용)', type: 'input', section: 'expense' },
    { id: 'rocketCost',    label: '로켓그로스',                     type: 'input',  section: 'expense' },
    { id: 'warehouseCost', label: '상품리스트 - 창고 택배비 비용\n(기준 : 4050원)', type: 'input', section: 'expense' },
    { id: 'naverAd',       label: '네이버 광고비',                  type: 'input',  section: 'expense' },
    { id: 'gmarketAd',     label: '지마켓 광고비',                  type: 'input',  section: 'expense' },
    { id: 'coupangAd',     label: '쿠팡 광고비',                   type: 'input',  section: 'expense' },
    { id: 'coupangAdVat',  label: '쿠팡 광고비(부가세)',            type: 'calc',   section: 'expense',
      formula: (m) => Math.round(m.coupangAd * 0.1) },
    { id: 'coupangService', label: '쿠팡 서비스 요금\n(배송비 제외 월매출 100만원 이상)\n정산-매출내역-정산차감', type: 'input', section: 'expense' },
    { id: 'rocketSaver',   label: '쿠팡 그로스 세이버(VAT포함)',   type: 'input',  section: 'expense' },
    { id: 'ollaFee',       label: '올라 선정산 수수료(VAT포함)',    type: 'input',  section: 'expense' },
    { id: 'totalExpense',  label: '총합 지출',                      type: 'calc',   section: 'expense',
      formula: (m) => m.loanPrincipal + m.loanInterest + m.logistics + m.rocketCost + m.warehouseCost + m.naverAd + m.coupangAd + m.gmarketAd + m.coupangAdVat + m.coupangService + m.rocketSaver + m.ollaFee },
    // === 결과 ===
    { id: 'finalIncome',   label: '최종 수익금',                    type: 'calc',   section: 'result',
      formula: (m) => m.totalProfit - m.totalExpense },
    { id: 'note',          label: '비고',                           type: 'note',   section: 'result' }
  ],

  // 일별 이익 행 (1~31일)
  DAILY_ROWS: 31,
  DAILY_LABEL_PREFIX: '엔와이 배송 - 이익(일) - ',
  DAILY_FIELD_PREFIX: 'daily_',

  // 섹션 정의 (헤더 행 + 색상)
  SECTIONS: [
    { id: 'info',    label: '📊 기본 정보',          headerClass: '' },
    { id: 'income',  label: '💰 매출',               headerClass: '' },
    { id: 'profit',  label: '📈 이익',               headerClass: '' },
    { id: 'expense', label: '📉 지출',               headerClass: '' },
    { id: 'result',  label: '🏆 결과',               headerClass: 'result-label' }
  ],

  // 기본값
  DEFAULT_MONTH: () => {
    const m = {};
    SETTLEMENT_CONFIG.ROWS.forEach(r => {
        if (r.type === 'yn') m[r.id] = 'Y';
        else if (r.type === 'text' || r.type === 'note') m[r.id] = '';
        else m[r.id] = 0;
    });
    // 일별 데이터
    for (let d = 1; d <= 31; d++) {
      m[SETTLEMENT_CONFIG.DAILY_FIELD_PREFIX + d] = 0;
    }
    m._nyDailySum = 0;
    return m;
  },

  MESSAGES: {
    SAVED:           '저장되었어요',
    SAVED_WITHOUT_IMAGES: null,
    SAVE_FAIL:       '저장 실패: ',
    SAVE_FAIL_QUOTA: '저장 공간이 부족해요.',
    LOAD_FAIL:       '불러오기 실패',
    EXPORT_DONE:     'JSON 내보내기 완료',
    EXPORT_FAIL:     '내보내기 실패: ',
    IMPORT_DONE:     '정산 데이터를 가져왔어요',
    IMPORT_FAIL:     '가져오기 실패: ',
    IMPORT_WRONG_PAGE: (pageName) => `이 파일은 '${pageName}' 페이지의 데이터입니다.`,
    PAGE_COMING:     (name) => `${name} 페이지는 준비 중이요`,
    CLEAR_TITLE:     '전체 초기화',
    CLEAR_TEXT:      '모든 정산 데이터를 초기화할까요?\n이 작업은 되돌릴 수 없어요.'
  }
};
