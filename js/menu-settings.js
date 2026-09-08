/* =====================================================
   menu-settings.js - 사용자 배지 드롭다운 + 환경설정 모달
   - user-badge(로그인 사용자 버튼, index.html에만 존재) 클릭 →
     드롭다운(환경설정 / 비밀번호 변경) 표시
   - 환경설정: 시장 그룹(KR/JP/US...)별 쇼핑몰 체크리스트
     체크 = 메뉴에 표시, 체크 해제 = 메뉴에서 숨김 (사용자별 저장)
   - 의존: menu.js(getHiddenMenuPages/setHiddenMenuPages/renderMenuItems),
     CONFIG.MENU_ITEMS, AccountRecovery, showToast
   - 시장 그룹은 CONFIG.MENU_ITEMS의 children 기준으로 동적 나열 →
     JP/US 등 신규 시장 추가 시 본 파일 수정 없이 자동 반영
   ===================================================== */

let _userBadgeMenuEl = null;
let _menuSettingsOverlayEl = null;

/** 배지 드롭다운 닫기 */
function closeUserBadgeMenu() {
  if (_userBadgeMenuEl) {
    _userBadgeMenuEl.remove();
    _userBadgeMenuEl = null;
    document.removeEventListener('click', _userBadgeMenuOutside);
    window.removeEventListener('resize', closeUserBadgeMenu);
  }
}

/** 드롭다운 외부 클릭 시 닫기 */
function _userBadgeMenuOutside(e) {
  if (_userBadgeMenuEl && !_userBadgeMenuEl.contains(e.target)) {
    closeUserBadgeMenu();
  }
}

/**
 * 사용자 배지 클릭 → 드롭다운 토글.
 * account-recovery.js의 bindUserBadgeClick에서 호출됨.
 */
function openUserBadgeMenu() {
  const badge = document.getElementById('user-badge');
  if (!badge) return;
  badge.title = '메뉴';

  // 이미 열려 있으면 닫기(토글)
  if (_userBadgeMenuEl) {
    closeUserBadgeMenu();
    return;
  }

  const menu = document.createElement('div');
  menu.className = 'user-badge-menu';
  menu.innerHTML =
    '<button type="button" class="user-badge-menu-item" data-action="settings">' +
      '<span class="user-badge-menu-icon">⚙️</span>환경설정</button>' +
    '<button type="button" class="user-badge-menu-item" data-action="password">' +
      '<span class="user-badge-menu-icon">🔑</span>비밀번호 변경</button>';
  document.body.appendChild(menu);
  _userBadgeMenuEl = menu;

  // 위치: 배지 바로 아래, 배지 우측에 맞춤 (topbar sticky → viewport 기준 fixed)
  // 단, 메뉴가 배지보다 넓어 화면 밖으로 나가면 좌우 보정
  const r = badge.getBoundingClientRect();
  menu.style.top = (r.bottom + 6) + 'px';
  const mw = menu.offsetWidth || 168;
  let left = r.right - mw;
  if (left < 8) left = 8;
  if (left + mw > window.innerWidth - 8) left = window.innerWidth - 8 - mw;
  menu.style.left = left + 'px';

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('.user-badge-menu-item');
    if (!btn) return;
    closeUserBadgeMenu();
    if (btn.dataset.action === 'settings') {
      openMenuSettingsModal();
    } else if (btn.dataset.action === 'password') {
      if (window.AccountRecovery) AccountRecovery.openChangePwModal();
    }
  });

  // 외부 클릭/리사이즈 시 닫기 (같은 클릭 이벤트로 즉시 닫히지 않게 setTimeout)
  setTimeout(() => {
    document.addEventListener('click', _userBadgeMenuOutside);
    window.addEventListener('resize', closeUserBadgeMenu);
  }, 0);
}

/** 환경설정 모달 닫기 */
function closeMenuSettingsModal() {
  if (_menuSettingsOverlayEl) {
    _menuSettingsOverlayEl.remove();
    _menuSettingsOverlayEl = null;
  }
}

/**
 * 환경설정 모달 열기.
 * CONFIG.MENU_ITEMS에서 children을 가진 그룹(시장)을 섹션으로 나열하고,
 * 각 쇼핑몰(ready 페이지)을 체크박스로 표시. 체크 = 표시, 해제 = 숨김.
 */
function openMenuSettingsModal() {
  closeMenuSettingsModal();
  closeUserBadgeMenu();

  const hiddenPages = getHiddenMenuPages();

  const overlay = document.createElement('div');
  overlay.className = 'menu-settings-overlay';

  // 시장 그룹 섹션 생성 (준비된 페이지가 있는 그룹만)
  let sectionsHtml = '';
  CONFIG.MENU_ITEMS.forEach(group => {
    if (!group.children || !group.children.length) return;
    const readyChildren = group.children.filter(c => c.ready);
    if (!readyChildren.length) return;

    let rowsHtml = '';
    readyChildren.forEach(child => {
      const checked = !hiddenPages.has(child.page) ? ' checked' : '';
      rowsHtml +=
        '<label class="menu-settings-row">' +
          '<input type="checkbox" class="menu-settings-check" data-page="' + child.page + '"' + checked + ' />' +
          '<span class="menu-settings-row-label">' + child.label + '</span>' +
        '</label>';
    });

    sectionsHtml +=
      '<div class="menu-settings-section">' +
        '<div class="menu-settings-section-title">' + group.label + '</div>' +
        rowsHtml +
      '</div>';
  });

  overlay.innerHTML =
    '<div class="menu-settings-modal">' +
      '<h3 class="menu-settings-title">⚙️ 환경설정</h3>' +
      '<p class="menu-settings-desc">메뉴에 표시할 쇼핑몰을 선택하세요. 체크를 해제하면 메뉴에서 숨겨져요.<br>설정은 이 아이디로 저장되며, 언제든 다시 변경할 수 있어요.</p>' +
      '<div class="menu-settings-body">' + sectionsHtml + '</div>' +
      '<p class="menu-settings-error" id="menu-settings-error"></p>' +
      '<div class="menu-settings-actions">' +
        '<button type="button" class="menu-settings-btn menu-settings-btn-cancel" id="menu-settings-cancel">취소</button>' +
        '<button type="button" class="menu-settings-btn menu-settings-btn-save" id="menu-settings-save">저장</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  _menuSettingsOverlayEl = overlay;

  // 닫기: 취소 버튼 / 배경 클릭
  overlay.querySelector('#menu-settings-cancel').addEventListener('click', closeMenuSettingsModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeMenuSettingsModal();
  });

  // 저장
  overlay.querySelector('#menu-settings-save').addEventListener('click', async (e) => {
    const saveBtn = e.currentTarget;
    const hidden = [];
    const errEl = overlay.querySelector('#menu-settings-error');
    overlay.querySelectorAll('.menu-settings-check').forEach(cb => {
      if (!cb.checked) hidden.push(cb.dataset.page);
    });

    // 전체 숨김 방지: 모든 쇼핑몰을 숨기면 메뉴를 쓸 수 없음
    const totalChecks = overlay.querySelectorAll('.menu-settings-check').length;
    if (hidden.length === totalChecks) {
      errEl.textContent = '최소 1개 이상의 쇼핑몰을 선택해 주세요';
      return;
    }

    setHiddenMenuPages(hidden);

    // 메뉴 즉시 재렌더링 (menu.js)
    if (typeof renderMenuItems === 'function') renderMenuItems();
    closeMenuSettingsModal();

    // 클라우드 동기화 시도 (실패해도 로컬 저장은 완료됨)
    let synced = false;
    if (typeof syncMenuSettings === 'function') {
      if (saveBtn) saveBtn.disabled = true;
      try { synced = await syncMenuSettings(); } catch (err) { /* ignore */ }
      if (saveBtn) saveBtn.disabled = false;
    }
    if (typeof showToast === 'function') {
      showToast(synced ? '⚙️ 환경설정 저장 + 클라우드 동기화 완료' : '⚙️ 환경설정을 저장했어요 (이 기기 전용)');
    }
  });

  // 열릴 때 배경 스크롤 방지는 하지 않음 (기존 모달들과 동일하게 단순 처리)
}

// 전역 노출 (account-recovery.js 등에서 사용)
window.openUserBadgeMenu = openUserBadgeMenu;
window.closeUserBadgeMenu = closeUserBadgeMenu;
window.openMenuSettingsModal = openMenuSettingsModal;
window.closeMenuSettingsModal = closeMenuSettingsModal;
