/* =====================================================
   field-labels.js - 필드 라벨 사용자 편집 (localStorage)
   - config.js 기본 라벨 위에 사용자 지정 라벨 덮어쓰기
   - ⚙ 버튼 클릭 → 모달에서 편집 → 저장 → render() 갱신
   ===================================================== */

const FIELD_LABELS_KEY = 'productslist_field_labels';

/** 메모리 캐시 (페이지 로드 시 1회 읽기) */
let _overrides = {};

/** localStorage에서 라벨 override 로드 */
function loadFieldLabels() {
  try {
    const raw = localStorage.getItem(FIELD_LABELS_KEY);
    _overrides = raw ? JSON.parse(raw) : {};
  } catch (e) {
    _overrides = {};
  }
}

/** localStorage에 라벨 override 저장 */
function saveFieldLabels(obj) {
  _overrides = obj || {};
  try {
    localStorage.setItem(FIELD_LABELS_KEY, JSON.stringify(_overrides));
  } catch (e) {
    // localStorage 실패 시 메모리만 유지
  }
}

/**
 * 필드 라벨 가져오기 (override 우선 → config.js fallback)
 * @param {string} fieldId - CONFIG.FIELDS의 키 (예: 'product', 'ny')
 * @returns {string} 표시할 라벨
 */
function getFieldLabel(fieldId) {
  if (_overrides[fieldId]) return _overrides[fieldId];
  const def = CONFIG.FIELDS[fieldId];
  return def ? def.label : fieldId;
}

/** 전체 override 객체 반환 (모달 채우기용) */
function getAllFieldLabels() {
  return Object.assign({}, _overrides);
}

/* ---------- 모달 렌더링 ---------- */

/** 편집 가능한 필드 목록 (CONFIG.FIELDS 기준) */
function getEditableFields() {
  return Object.keys(CONFIG.FIELDS);
}

/** 모달 열기 */
function openLabelModal() {
  const modal = document.getElementById('label-modal');
  if (!modal) return;

  const list = document.getElementById('label-modal-list');
  if (!list) return;

  // 기존 내용 비우기
  list.innerHTML = '';

  // CONFIG.FIELDS의 각 필드에 대해 input 행 생성
  getEditableFields().forEach(fieldId => {
    const def = CONFIG.FIELDS[fieldId];
    const currentLabel = getFieldLabel(fieldId);

    const row = document.createElement('div');
    row.className = 'label-modal-row';
    row.innerHTML = `
      <span class="label-modal-key" title="${escapeAttr(fieldId)}">${escapeAttr(fieldId)}</span>
      <input type="text" class="label-modal-input" data-field="${escapeAttr(fieldId)}"
             value="${escapeAttr(currentLabel)}"
             placeholder="${escapeAttr(def.label)}" />
    `;
    list.appendChild(row);
  });

  modal.classList.add('show');
}

/** 모달 닫기 */
function closeLabelModal() {
  const modal = document.getElementById('label-modal');
  if (modal) modal.classList.remove('show');
}

/** 모달에서 저장 */
function saveLabelModal() {
  const inputs = document.querySelectorAll('.label-modal-input');
  const newOverrides = {};

  inputs.forEach(input => {
    const fieldId = input.dataset.field;
    const val = input.value.trim();
    // config.js 기본값과 다를 때만 override에 저장 (같으면 빈값 = 기본값 사용)
    const defaultLabel = CONFIG.FIELDS[fieldId] ? CONFIG.FIELDS[fieldId].label : '';
    if (val && val !== defaultLabel) {
      newOverrides[fieldId] = val;
    }
  });

  saveFieldLabels(newOverrides);
  closeLabelModal();

  // 카드 재렌더
  if (typeof render === 'function') {
    render();
  }

  // 토스트
  if (typeof showToast === 'function') {
    showToast('라벨이 저장되었어요');
  }
}

/** 모달에서 초기화 (모든 override 삭제) */
function resetLabelModal() {
  saveFieldLabels({});
  closeLabelModal();
  if (typeof render === 'function') {
    render();
  }
  if (typeof showToast === 'function') {
    showToast('라벨이 초기화되었어요');
  }
}

/* ---------- 초기화 ---------- */
(function initFieldLabels() {
  // 페이지 로드 시 localStorage 읽기
  loadFieldLabels();

  // DOMContentLoaded 후에 버튼/모달 이벤트 바인딩
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-label-settings');
    if (btn) {
      btn.addEventListener('click', openLabelModal);
    }

    const closeBtn = document.getElementById('label-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeLabelModal);
    }

    const saveBtn = document.getElementById('label-modal-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveLabelModal);
    }

    const cancelBtn = document.getElementById('label-modal-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeLabelModal);
    }

    const resetBtn = document.getElementById('label-modal-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', resetLabelModal);
    }

    // 배경 클릭 시 닫기
    const modal = document.getElementById('label-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeLabelModal();
      });
    }
  });
})();
