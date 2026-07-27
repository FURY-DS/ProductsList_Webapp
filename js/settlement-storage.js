/* =====================================================
   settlement-storage.js - 오픈마켓정산 localStorage 저장/불러오기
   ===================================================== */

function saveSettlement() {
  try {
    const data = JSON.stringify({ year: settlementState.year, months: settlementState.months });
    localStorage.setItem(SETTLEMENT_CONFIG.STORAGE_KEY, data);
    try {
      localStorage.setItem(SETTLEMENT_CONFIG.STORAGE_KEY + '_backup', data);
    } catch (backupError) {
      console.warn('Backup save failed', backupError);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, msg: SETTLEMENT_CONFIG.MESSAGES.SAVE_FAIL + (e.message || '') };
  }
}

function loadSettlement() {
  try {
    const raw = localStorage.getItem(SETTLEMENT_CONFIG.STORAGE_KEY);
    if (!raw) {
      // 새 데이터 초기화
      initEmptySettlement();
      return;
    }
    const parsed = JSON.parse(raw);
    if (parsed && parsed.months && Array.isArray(parsed.months)) {
      settlementState.year = parsed.year || new Date().getFullYear();
      settlementState.months = parsed.months.map(m => {
        const defaultMonth = SETTLEMENT_CONFIG.DEFAULT_MONTH();
        // 누락 필드 보정
        Object.keys(defaultMonth).forEach(k => {
          if (m[k] === undefined) m[k] = defaultMonth[k];
        });
        return m;
      });
      recalcAll();
      return;
    }
    // 손상 → 백업 복구
    loadSettlementBackup();
  } catch (e) {
    loadSettlementBackup();
  }
}

function loadSettlementBackup() {
  try {
    const backupRaw = localStorage.getItem(SETTLEMENT_CONFIG.STORAGE_KEY + '_backup');
    if (!backupRaw) {
      initEmptySettlement();
      return;
    }
    const backup = JSON.parse(backupRaw);
    if (backup && backup.months && Array.isArray(backup.months)) {
      settlementState.year = backup.year || new Date().getFullYear();
      settlementState.months = backup.months;
      recalcAll();
      reportSaveResult(saveSettlement(), SETTLEMENT_CONFIG.MESSAGES);
      return;
    }
    initEmptySettlement();
  } catch (e2) {
    initEmptySettlement();
  }
}

function initEmptySettlement() {
  settlementState.year = new Date().getFullYear();
  settlementState.months = [];
  for (let i = 0; i < 12; i++) {
    settlementState.months.push(SETTLEMENT_CONFIG.DEFAULT_MONTH());
  }
}
