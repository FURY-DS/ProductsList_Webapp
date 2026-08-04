/* =====================================================
   settlement-app.js - 오픈마켓정산 초기화 및 라이프사이클
   ===================================================== */

async function initSettlement() {
  initModal();
  initSettlementRender();

  // 계정이 신규/삭제된 상태면 (서버 메인 데이터 비어있음) localStorage의 정산 데이터 정리
  await clearStalePageDataIfServerEmpty(SETTLEMENT_CONFIG.STORAGE_KEY);

  loadSettlement();

  // 연도 선택기
  const yearSelect = document.getElementById('year-select');
  if (yearSelect) {
    yearSelect.value = settlementState.year;
    yearSelect.addEventListener('change', (e) => {
      changeSettlementYear(parseInt(e.target.value));
    });
  }

  // 버튼 이벤트
  const btnExport = document.getElementById('btn-settlement-export');
  if (btnExport) btnExport.addEventListener('click', exportSettlement);

  const btnImport = document.getElementById('btn-settlement-import');
  if (btnImport) btnImport.addEventListener('click', importSettlement);

  const btnClear = document.getElementById('btn-settlement-clear');
  if (btnClear) btnClear.addEventListener('click', clearSettlement);

  // 일별 섹션 토글
  if (dailyToggleEl) {
    dailyToggleEl.addEventListener('click', toggleDailySection);
    dailyToggleEl.classList.toggle('open', settlementState.dailyExpanded);
  }

  renderSettlement();

  // Ctrl+S 저장
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      reportSaveResult(saveSettlement(), SETTLEMENT_CONFIG.MESSAGES, SETTLEMENT_CONFIG.MESSAGES.SAVED);
    }
  });

  // beforeunload 저장
  window.addEventListener('beforeunload', () => {
    reportSaveResult(saveSettlement(), SETTLEMENT_CONFIG.MESSAGES);
  });

  // pageshow (bfcache)
  window.addEventListener('pageshow', () => {
    loadSettlement();
    renderSettlement();
  });
}
