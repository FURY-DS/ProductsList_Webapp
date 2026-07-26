/* =====================================================
   modal.js - 확인 모달 다이얼로그
   ===================================================== */

let modalEl = null;
let modalCallback = null;

/** 모달 요소 초기화 및 이벤트 바인딩 (DOM 로드 후 호출) */
function initModal() {
  modalEl = document.getElementById('modal');

  document.getElementById('modal-cancel').addEventListener('click', () => {
    closeModal();
  });

  document.getElementById('modal-confirm').addEventListener('click', () => {
    const cb = modalCallback;
    closeModal();
    if (cb) cb();
  });

  // 배경 클릭 시 닫기
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeModal();
  });
}

/** 모달 닫기 */
function closeModal() {
  modalEl.classList.remove('show');
  modalCallback = null;
}

/**
 * 모달 표시
 * @param {Object} opts - { title, text, onConfirm }
 */
function showModal({ title, text, onConfirm }) {
  document.getElementById('modal-title').textContent = title || '확인';
  document.getElementById('modal-text').textContent = text || '';
  modalEl.classList.add('show');
  modalCallback = onConfirm || null;
}

/** 모달이 표시 중인지 확인 */
function isModalOpen() {
  return modalEl && modalEl.classList.contains('show');
}
