/* =====================================================
   toast.js - 하단 토스트 알림
   ===================================================== */

let toastEl = null;
let toastTimer = null;

/** 토스트 요소 초기화 (DOM 로드 후 호출) */
function initToast() {
  toastEl = document.getElementById('toast');
}

/** 토스트 메시지 표시 */
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, CONFIG.TOAST_DURATION);
}
