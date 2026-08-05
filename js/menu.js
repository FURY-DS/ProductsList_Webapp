/* =====================================================
   menu.js - 상단 메뉴 드롭다운
   ===================================================== */

let btnMenuEl = null;
let menuDropdownEl = null;
let _menuInitialized = false;

/**
 * 현재 사용자명 반환. Auth.init() 후 호출되어야 함 (app.js 흐름 참고).
 * @returns {string|null}
 */
function getCurrentUsername() {
  return (typeof Auth !== 'undefined' && Auth.username) || null;
}

/** 현재 역할 반환 */
function getCurrentRole() {
  return (typeof Auth !== 'undefined' && Auth.role) || null;
}

/** 관리자 여부 */
function isCurrentUserAdmin() {
  return getCurrentRole() === 'admin';
}

/** 특정 사용자 전용 항목 접근 가능 여부 */
function canAccessExclusiveUser(item) {
  if (!item.exclusiveUser) return true;
  return getCurrentUsername() === item.exclusiveUser;
}

/** 메뉴 초기화 (DOM 로드 후 호출) */
function initMenu() {
  btnMenuEl = document.getElementById('btn-menu');
  menuDropdownEl = document.getElementById('menu-dropdown');

  // 메뉴 항목 렌더링 (사용자 변경 시 필터링을 위해 매번 재렌더링)
  renderMenuItems();

  // 이미 이벤트 리스너가 바인딩된 경우 재바인딩하지 않음
  if (_menuInitialized) return;
  _menuInitialized = true;

  // 메뉴 버튼 토글
  btnMenuEl.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // 메뉴 항목 클릭
  menuDropdownEl.addEventListener('click', (e) => {
    const groupToggle = e.target.closest('.menu-group-toggle');
    if (groupToggle) {
      e.stopPropagation();
      toggleMenuGroup(groupToggle.dataset.group);
      return;
    }

    const item = e.target.closest('button[data-page]');
    if (!item) return;
    handleMenuSelect(item.dataset.page, item.textContent.trim());
  });

  // 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-wrapper') && menuDropdownEl.classList.contains('show')) {
      toggleMenu(false);
    }
  });
}

/** CONFIG.MENU_ITEMS로 드롭다운 항목 동적 생성 */
function renderMenuItems() {
  menuDropdownEl.innerHTML = '';
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  CONFIG.MENU_ITEMS.forEach(item => {
    // exclusiveUser: 특정 사용자만 접근 가능
    if (item.exclusiveUser && !canAccessExclusiveUser(item)) return;
    // adminOnly 항목은 관리자에게만 표시 (레거시 호환)
    if (item.adminOnly && !isCurrentUserAdmin()) return;

    if (item.children && item.children.length > 0) {
      // 중첩 메뉴 그룹
      const group = document.createElement('div');
      group.className = 'menu-group';

      const toggle = document.createElement('button');
      toggle.className = 'menu-group-toggle';
      toggle.dataset.group = item.page;
      toggle.title = `${item.label} 메뉴`;
      toggle.innerHTML = `<span>${item.label}</span><span class="menu-group-arrow">▸</span>`;

      // 현재 페이지가 그룹 하위에 있으면 그룹을 활성/펼침 표시
      const hasActiveChild = item.children.some(child => child.url === currentPage || (currentPage === '' && child.url === 'index.html'));
      if (hasActiveChild) {
        group.classList.add('active-group');
        group.classList.add('open');
      }

      const sub = document.createElement('div');
      sub.className = 'menu-sub';
      if (hasActiveChild) sub.classList.add('show');

      item.children.forEach(child => {
        // 하위 항목도 exclusiveUser / adminOnly 필터링
        if (child.exclusiveUser && !canAccessExclusiveUser(child)) return;
        if (child.adminOnly && !isCurrentUserAdmin()) return;
        const btn = createMenuButton(child, currentPage);
        sub.appendChild(btn);
      });

      group.appendChild(toggle);
      group.appendChild(sub);
      menuDropdownEl.appendChild(group);
    } else {
      // 일반 메뉴 항목
      const btn = createMenuButton(item, currentPage);
      menuDropdownEl.appendChild(btn);
    }
  });
}

/** 단일 메뉴 버튼 생성 */
function createMenuButton(item, currentPage) {
  const btn = document.createElement('button');
  btn.dataset.page = item.page;
  btn.title = item.ready ? `${item.label} 페이지` : `${item.label} (준비 중)`;
  const isActive = item.url === currentPage || (currentPage === '' && item.url === 'index.html');
  if (isActive) btn.classList.add('active');
  if (!item.ready) btn.classList.add('coming-soon');
  btn.textContent = item.label;
  return btn;
}

/** 메뉴 토글 (true/false 지정 또는 토글) */
function toggleMenu(show) {
  if (typeof show === 'boolean') {
    menuDropdownEl.classList.toggle('show', show);
  } else {
    menuDropdownEl.classList.toggle('show');
  }
}

/** 서브 메뉴 그룹 토글 */
function toggleMenuGroup(groupPage) {
  const group = menuDropdownEl.querySelector(`.menu-group-toggle[data-group="${groupPage}"]`)?.parentElement;
  if (!group) return;
  const wasOpen = group.classList.contains('open');

  // 다른 그룹은 닫기
  menuDropdownEl.querySelectorAll('.menu-group.open').forEach(g => {
    if (g !== group) {
      g.classList.remove('open');
      const sub = g.querySelector('.menu-sub');
      if (sub) sub.classList.remove('show');
    }
  });

  group.classList.toggle('open', !wasOpen);
  const sub = group.querySelector('.menu-sub');
  if (sub) sub.classList.toggle('show', !wasOpen);
}

/** 메뉴가 열린 상태인지 */
function isMenuOpen() {
  return menuDropdownEl && menuDropdownEl.classList.contains('show');
}

/** 모든 메뉴 항목을 평탄화한 배열 반환 */
function flattenMenuItems() {
  const items = [];
  CONFIG.MENU_ITEMS.forEach(item => {
    if (item.children) {
      item.children.forEach(child => items.push(child));
    } else {
      items.push(item);
    }
  });
  return items;
}

/** 메뉴 항목 선택 처리 */
function handleMenuSelect(page, label) {
  const item = flattenMenuItems().find(m => m.page === page);
  if (!item) return;

  if (!item.ready) {
    showToast(CONFIG.MESSAGES.PAGE_COMING(label));
    toggleMenu(false);
    return;
  }

  // 같은 페이지면 새로고침, 다른 페이지면 이동
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (item.url === currentPage || (currentPage === '' && item.url === 'index.html')) {
    window.location.reload();
  } else if (item.url && item.url !== '#') {
    window.location.href = item.url;
  }
  toggleMenu(false);
}
