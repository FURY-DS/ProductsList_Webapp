/* =====================================================
   utils.js - 공용 유틸리티 함수
   ===================================================== */

/** 현재 로그인한 사용자의 localStorage 데이터 키 반환 */
function getCurrentStorageUsername() {
  const username = (typeof Auth !== 'undefined' && Auth.username)
    || Auth._readStored('auth_username')
    || 'guest';
  return username;
}

/** 기본 localStorage 키를 현재 사용자 전용 키로 변환 */
function getUserScopedKey(baseKey) {
  return baseKey + '_' + getCurrentStorageUsername();
}

/** 현재 로그인한 사용자의 localStorage 데이터 키 반환 */
function getStorageKey() {
  return CONFIG.STORAGE_KEY + '_' + getCurrentStorageUsername();
}

/** 현재 로그인한 사용자의 클라우드 동기화 타임스탬프 키 반환 */
function getSyncKey() {
  return 'cloud_last_sync_' + getCurrentStorageUsername();
}

/**
 * 사용자별 키가 비어 있으면 기존 전역 키 데이터를 한 번 복사 (구버전 호환).
 * @param {string} baseKey
 * @param {(data:any)=>boolean} [isValidData] - 데이터 유효성 검증 (선택)
 * @returns {string} 최종 user-scoped 키 (정리 안 됐으면 scoped key 반환)
 */
function migrateLegacyKeyToUserScope(baseKey, isValidData) {
  const scopedKey = getUserScopedKey(baseKey);
  if (localStorage.getItem(scopedKey)) return scopedKey;

  const legacyRaw = localStorage.getItem(baseKey);
  if (!legacyRaw) return scopedKey;

  try {
    const parsed = JSON.parse(legacyRaw);
    if (typeof isValidData === 'function' && !isValidData(parsed)) return scopedKey;
    localStorage.setItem(scopedKey, legacyRaw);
    try {
      localStorage.setItem(scopedKey + '_backup', legacyRaw);
    } catch (e) { /* ignore */ }
  } catch (e) { /* ignore */ }

  return scopedKey;
}

/**
 * 사용자별 키 우선, 없으면 기존 전역 키를 fallback으로 읽기.
 * @param {string} baseKey
 * @returns {string|null} raw 문자열 (JSON.parse는 호출자에서)
 */
function getUserScopedItemWithFallback(baseKey) {
  const scopedRaw = localStorage.getItem(getUserScopedKey(baseKey));
  if (scopedRaw) return scopedRaw;
  return localStorage.getItem(baseKey);
}

/**
 * 로그인 토큰 없이 보조 페이지에 직접 접근하면 로그인 화면으로 돌려보냄.
 * @returns {boolean} 인증되어 있으면 true
 */
function requireAuthenticatedPage() {
  if (typeof Auth !== 'undefined' && Auth.isAuthenticated()) return true;
  window.location.replace('index.html');
  return false;
}

/** HTML 속성값 이스케이프 (XSS 방지) */
function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 숫자를 한국어 천 단위 콤마 형식으로 변환 (소수점 최대 2자리) */
function formatNumber(n) {
  if (!isFinite(n)) return '';
  return n.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

/** 고유 카드 ID 생성 */
function generateId() {
  return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

/** 숫자를 안전하게 파싱 (콤마 제거, 실패 시 0) */
function parseNum(v) {
  if (typeof v === 'string') v = v.replace(/,/g, '');
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
}

/** 소수점 2자리 반올림 */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/** 소수점 4자리 반올림 (환율 배수 계산 등 정밀도 필요 시) */
function round4(n) {
  return Math.round(n * 10000) / 10000;
}

/**
 * 저장 결과를 토스트로 알림.
 * save 계열 함수는 토스트를 직접 띄우지 않고 { ok, imagesRemoved?, msg? }를 반환하므로,
 * 호출한 쪽에서 반드시 이 함수로 결과를 전달해야 실패가 묻히지 않는다.
 * @param {Object} result - save 계열 함수의 반환값
 * @param {Object} messages - 해당 페이지의 CONFIG.MESSAGES
 * @param {string} [successMsg] - 성공 시 표시할 메시지 (생략하면 성공 시 아무것도 표시하지 않음)
 * @returns {boolean} 저장 성공 여부
 */
function reportSaveResult(result, messages, successMsg) {
  // 저장이 성공했거나 결과를 알 수 없는 경우
  if (!result || result.ok) {
    // 이미지가 제거된 채 저장됐다면 성공 메시지보다 이 경고를 우선 표시
    if (result && result.imagesRemoved) {
      showToast(messages.SAVED_WITHOUT_IMAGES);
    } else if (successMsg) {
      showToast(successMsg);
    }
    return true;
  }
  showToast(result.msg || messages.SAVE_FAIL);
  return false;
}
