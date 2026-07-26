/* =====================================================
   utils.js - 공용 유틸리티 함수
   ===================================================== */

/** HTML 속성값 이스케이프 (XSS 방지) */
function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 숫자를 한국어 천 단위 콤마 형식으로 변환 */
function formatNumber(n) {
  if (!isFinite(n) || n === 0) return '';
  return n.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

/** 고유 카드 ID 생성 */
function generateId() {
  return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

/** 숫자를 안전하게 파싱 (실패 시 0) */
function parseNum(v) {
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
}
