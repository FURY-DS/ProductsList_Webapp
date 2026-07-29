/* =====================================================
   settlement-storage.js - 오픈마켓정산 localStorage 저장/불러오기
   다년도 저장 지원 (version 2)
   ===================================================== */

const SETTLEMENT_STORAGE_VERSION = 2;

/** 현재 상태를 localStorage에 저장 (현재 연도 데이터만 업데이트) */
function saveSettlement() {
  try {
    const storage = readSettlementStorage();
    storage.currentYear = settlementState.year;
    if (!storage.years) storage.years = {};
    storage.years[String(settlementState.year)] = { months: settlementState.months };
    const data = JSON.stringify(storage);
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

/** localStorage에서 storage 객체 읽기 (구버전 자동 마이그레이션) */
function readSettlementStorage() {
  // 1. 메인 키 시도
  try {
    const raw = localStorage.getItem(SETTLEMENT_CONFIG.STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === SETTLEMENT_STORAGE_VERSION) {
        return parsed;
      }
      // 구버전 단일연도 형식: { year, months }
      if (parsed && parsed.months && Array.isArray(parsed.months)) {
        return migrateToV2(parsed);
      }
    }
  } catch (e) { /* fall through */ }

  // 2. 백업 키 시도
  try {
    const backupRaw = localStorage.getItem(SETTLEMENT_CONFIG.STORAGE_KEY + '_backup');
    if (backupRaw) {
      const backup = JSON.parse(backupRaw);
      if (backup && backup.version === SETTLEMENT_STORAGE_VERSION) {
        return backup;
      }
      if (backup && backup.months && Array.isArray(backup.months)) {
        return migrateToV2(backup);
      }
    }
  } catch (e) { /* fall through */ }

  // 3. 연도별 키만 존재하는 경우
  return scanYearKeys();
}

/** 구버전 데이터를 v2 형식으로 마이그레이션 + 연도별 키 통합 */
function migrateToV2(oldData) {
  const storage = {
    version: SETTLEMENT_STORAGE_VERSION,
    currentYear: oldData.year || new Date().getFullYear(),
    years: {}
  };
  if (oldData.months && Array.isArray(oldData.months)) {
    storage.years[String(storage.currentYear)] = { months: oldData.months };
  }
  // 연도별 키(settlement_v1_YYYY)도 스캔하여 통합
  scanYearKeysInto(storage);
  return storage;
}

/** localStorage에서 settlement_v1_YYYY 형태의 키들을 스캔하여 storage에 병합 */
function scanYearKeysInto(storage) {
  const prefix = SETTLEMENT_CONFIG.STORAGE_KEY + '_';
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const suffix = key.substring(prefix.length);
    if (suffix === 'backup') continue;
    const year = parseInt(suffix);
    if (isNaN(year)) continue;
    const yearStr = String(year);
    if (storage.years[yearStr]) continue; // 이미 있음
    try {
      const raw = localStorage.getItem(key);
      const parsed = JSON.parse(raw);
      if (parsed && parsed.months && Array.isArray(parsed.months)) {
        storage.years[yearStr] = { months: parsed.months };
      }
    } catch (e) { /* ignore */ }
  }
}

/** 연도별 키만으로 storage 객체 구성 (메인/백업 키가 없을 때) */
function scanYearKeys() {
  const storage = {
    version: SETTLEMENT_STORAGE_VERSION,
    currentYear: new Date().getFullYear(),
    years: {}
  };
  scanYearKeysInto(storage);
  return storage;
}

/** 구버전 연도별 키(settlement_v1_YYYY) 정리 */
function cleanupOldYearKeys() {
  const prefix = SETTLEMENT_CONFIG.STORAGE_KEY + '_';
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const suffix = key.substring(prefix.length);
    if (suffix === 'backup') continue;
    const year = parseInt(suffix);
    if (!isNaN(year)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => {
    try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
  });
}

/** 페이지 로드 시: storage에서 데이터 로드하여 state에 설정 */
function loadSettlement() {
  let needsSave = false;
  let storage = null;

  // 메인 키 확인
  try {
    const raw = localStorage.getItem(SETTLEMENT_CONFIG.STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === SETTLEMENT_STORAGE_VERSION) {
        storage = parsed;
      } else if (parsed && parsed.months && Array.isArray(parsed.months)) {
        // 구버전 → 마이그레이션
        storage = migrateToV2(parsed);
        needsSave = true;
      }
    }
  } catch (e) { /* fall through */ }

  // 백업 키 확인
  if (!storage) {
    try {
      const backupRaw = localStorage.getItem(SETTLEMENT_CONFIG.STORAGE_KEY + '_backup');
      if (backupRaw) {
        const backup = JSON.parse(backupRaw);
        if (backup && backup.version === SETTLEMENT_STORAGE_VERSION) {
          storage = backup;
        } else if (backup && backup.months && Array.isArray(backup.months)) {
          storage = migrateToV2(backup);
          needsSave = true;
        }
      }
    } catch (e) { /* fall through */ }
  }

  // 연도별 키만 있는 경우
  if (!storage) {
    storage = scanYearKeys();
    if (Object.keys(storage.years).length > 0) {
      needsSave = true;
    }
  }

  // state 설정
  settlementState.year = storage.currentYear || new Date().getFullYear();

  const yearData = storage.years && storage.years[String(settlementState.year)];
  if (yearData && yearData.months && Array.isArray(yearData.months)) {
    settlementState.months = yearData.months.map(m => {
      const defaultMonth = SETTLEMENT_CONFIG.DEFAULT_MONTH();
      Object.keys(defaultMonth).forEach(k => {
        if (m[k] === undefined) m[k] = defaultMonth[k];
      });
      return m;
    });
  } else {
    initEmptyMonths();
  }
  recalcAll();

  // 마이그레이션된 경우 새 형식으로 저장 + 구키 정리
  if (needsSave) {
    saveSettlement();
    cleanupOldYearKeys();
  }
}

/** 특정 연도의 months 데이터 로드 (없으면 null) */
function loadYearData(year) {
  const storage = readSettlementStorage();
  const yearData = storage.years && storage.years[String(year)];
  if (yearData && yearData.months && Array.isArray(yearData.months)) {
    return yearData.months.map(m => {
      const defaultMonth = SETTLEMENT_CONFIG.DEFAULT_MONTH();
      Object.keys(defaultMonth).forEach(k => {
        if (m[k] === undefined) m[k] = defaultMonth[k];
      });
      return m;
    });
  }
  return null;
}

/** 빈 months 배열 생성 (year는 변경하지 않음) */
function initEmptyMonths() {
  settlementState.months = [];
  for (let i = 0; i < 12; i++) {
    settlementState.months.push(SETTLEMENT_CONFIG.DEFAULT_MONTH());
  }
}

/** 호환성 유지: 빈 months 생성 (year는 변경하지 않음) */
function initEmptySettlement() {
  initEmptyMonths();
}
