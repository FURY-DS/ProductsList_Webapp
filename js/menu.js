/* =====================================================
   menu.js - 상단 메뉴 드롭다운
   ===================================================== */

let btnMenuEl = null;
let menuDropdownEl = null;

/** 메뉴 초기화 (DOM 로드 후 호출) */
function initMenu() {
  btnMenuEl = document.getElementById('btn-menu');
  menuDropdownEl = document.getElementById('menu-dropdown');

  // CONFIG.MENU_ITEMS 기반으로 메뉴 항목 렌더링
  renderMenuItems();

  // 메뉴 버튼 토글
  btnMenuEl.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // 메뉴 항목 클릭
  menuDropdownEl.addEventListener('click', (e) => {
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
    const btn = document.createElement('button');
    btn.dataset.page = item.page;
    btn.title = item.ready ? `${item.label} 페이지` : `${item.label} (준비 중)`;
    const isActive = item.url === currentPage || (currentPage === '' && item.url === 'index.html');
    if (isActive) btn.classList.add('active');
    if (!item.ready) btn.classList.add('coming-soon');
    btn.textContent = item.label;
    menuDropdownEl.appendChild(btn);
  });
}

/** 메뉴 토글 (true/false 지정 또는 토글) */
function toggleMenu(show) {
  if (typeof show === 'boolean') {
    menuDropdownEl.classList.toggle('show', show);
  } else {
    menuDropdownEl.classList.toggle('show');
  }
}

/** 메뉴가 열려있는지 */
function isMenuOpen() {
  return menuDropdownEl && menuDropdownEl.classList.contains('show');
}

/** 메뉴 항목 선택 처리 */
function handleMenuSelect(page, label) {
  const item = CONFIG.MENU_ITEMS.find(m => m.page === page);
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
