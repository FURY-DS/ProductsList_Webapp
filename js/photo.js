/* =====================================================
   photo.js - 상품 사진 업로드 / 수정 / 삭제
   ===================================================== */

/**
 * 파일 선택 다이얼로그를 띄워 사진 업로드 처리
 * @param {string} cardId - 대상 카드 ID
 */
function triggerPhotoUpload(cardId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.className = 'photo-input';

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 크기 제한 검사
    if (file.size > CONFIG.IMAGE_MAX_SIZE) {
      showToast(CONFIG.MESSAGES.IMAGE_TOO_BIG);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const c = findCard(cardId);
      if (!c) return;
      c.image = ev.target.result;
      save();
      render();
      showToast(CONFIG.MESSAGES.IMAGE_ADDED);
    };
    reader.readAsDataURL(file);
  });

  input.click();
}

/**
 * 카드의 사진 삭제
 * @param {string} cardId - 대상 카드 ID
 */
function removePhoto(cardId) {
  const c = findCard(cardId);
  if (!c) return;
  c.image = '';
  save();
  render();
  showToast(CONFIG.MESSAGES.IMAGE_REMOVED);
}
