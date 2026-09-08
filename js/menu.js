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

// =====================================================
//  사용자별 메뉴 표시 설정 (환경설정에서 체크한 쇼핑몰만 표시)
//  - localStorage에 사용자명별로 숨김 페이지 목록 저장
//  - 시장 그룹(KR/JP/US) 하위 children에만 적용 → 신규 시장 추가 시 자동 대응
// =====================================================

/** 사용자별 숨김 페이지 목록의 localStorage 키 */
function getMenuSettingsKey() {
  return 'menu_hidden_pages_' + (getCurrentUsername() || 'guest');
}

/** 숨김 설정 타임스탬프 키 (클라우드 동기화 충돌 판단용) */
function getMenuSettingsTsKey() {
  return 'menu_hidden_ts_' + (getCurrentUsername() || 'guest');
}

/** 로컬에 저장된 설정 타임스탬프 (없으면 0) */
function getMenuSettingsTs() {
  return parseInt(localStorage.getItem(getMenuSettingsTsKey()) || '0', 10) || 0;
}

/** 숨김 페이지 목록을 Set으로 반환 (없으면 빈 Set = 전체 표시) */
function getHiddenMenuPages() {
  try {
    const raw = localStorage.getItem(getMenuSettingsKey());
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch (e) {
    return new Set();
  }
}

/** 특정 페이지가 숨김 상태인지 */
function isMenuPageHidden(page) {
  return getHiddenMenuPages().has(page);
}

/** 숨김 페이지 목록 저장 (배열). 클라우드 동기화용 타임스탬프도 함께 갱신 */
function setHiddenMenuPages(pageArr) {
  try {
    localStorage.setItem(getMenuSettingsKey(), JSON.stringify(pageArr));
    localStorage.setItem(getMenuSettingsTsKey(), String(Date.now()));
  } catch (e) { /* ignore */ }
}

/**
 * 메뉴 표시 설정 클라우드 동기화 (KV: data:<user>:menu_settings)
 * - 서버가 더 최신(ts 비교) → 서버 설정을 localStorage에 반영 + 메뉴 재렌더링
 * - 로컬이 더 최신(사용자가 저장한 경우만, ts>0) → 로컬 설정을 서버에 push
 * - 주의: ts 없는 오래된 로컬 설정(localTs===0)은 절대 자동 push하지 않음.
 *   (오래된 기기가 자기 옛 설정을 서버에 덮어쓰는 사고 방지. 서버가 비어 있으면
 *   로컬 설정 그대로 사용 → 사용자가 환경설정 저장 시 그때 동기화됨)
 * - initMenu()에서 로그인 상태일 때 호출. 실패해도 조용히 무시(로컬 설정 유지).
 * @returns {Promise<boolean>} 동기화 성공 여부 (서버 반영 또는 push 완료)
 */
async function syncMenuSettings() {
  if (typeof Auth === 'undefined' || !Auth.isAuthenticated || !Auth.isAuthenticated() || !Auth.token) return false;
  try {
    const res = await fetch('/api/data?key=menu_settings', { headers: Auth.getAuthHeader() });
    if (!res.ok) return false;
    const result = await res.json();
    const serverTs = (result && result.ts) || 0;
    const localTs = getMenuSettingsTs();
    const localRaw = localStorage.getItem(getMenuSettingsKey());

    if (serverTs > localTs) {
      // 서버가 최신 → 로컬에 반영
      const hidden = (result.data && Array.isArray(result.data.hidden)) ? result.data.hidden : [];
      try { localStorage.setItem(getMenuSettingsKey(), JSON.stringify(hidden)); } catch (e) { return false; }
      localStorage.setItem(getMenuSettingsTsKey(), String(serverTs));
      if (typeof renderMenuItems === 'function') renderMenuItems();
      return true;
    }

    if (localRaw !== null && localTs > 0 && localTs > serverTs) {
      // 로컬이 최신(사용자 저장 이력 있음) → 서버에 push
      let hidden;
      try { hidden = JSON.parse(localRaw); } catch (e) { return false; }
      if (!Array.isArray(hidden)) return false;
      const pushRes = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...Auth.getAuthHeader() },
        body: JSON.stringify({ data: { hidden: hidden }, ts: localTs, key: 'menu_settings' })
      });
      return pushRes.ok;
    }

    // 양쪽 동일 또는 로컬에 저장 이력 없음 → 할 일 없음
    return true;
  } catch (e) {
    console.warn('[MenuSync] 실패:', e.message);
    return false;
  }
}

/** 메뉴 초기화 (DOM 로드 후 호출) */
function initMenu() {
  btnMenuEl = document.getElementById('btn-menu');
  menuDropdownEl = document.getElementById('menu-dropdown');

  // 메뉴 항목 렌더링 (사용자 변경 시 필터링을 위해 매번 재렌더링)
  renderMenuItems();

  // 로그인 상태면 메뉴 설정 클라우드 동기화 (백그라운드, 실패 무시)
  syncMenuSettings();

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

    const item = e.target.closest('a[data-page], button[data-page]');
    if (!item) return;
    e.preventDefault();
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
      // 환경설정에서 제외한(숨긴) 하위 페이지는 메뉴에서 제외
      const hiddenPages = getHiddenMenuPages();
      const visibleChildren = item.children.filter(child => {
        if (child.exclusiveUser && !canAccessExclusiveUser(child)) return false;
        if (child.adminOnly && !isCurrentUserAdmin()) return false;
        if (hiddenPages.has(child.page)) return false;
        return true;
      });
      // 표시할 하위 페이지가 없으면 그룹 자체를 숨김
      if (visibleChildren.length === 0) return;

      const group = document.createElement('div');
      group.className = 'menu-group';

      const toggle = document.createElement('button');
      toggle.className = 'menu-group-toggle';
      toggle.dataset.group = item.page;
      toggle.title = `${item.label} 메뉴`;
      toggle.innerHTML = `<span>${item.label}</span><span class="menu-group-arrow">▸</span>`;

      // 현재 페이지가 그룹 하위에 있으면 그룹을 활성/펼침 표시
      const hasActiveChild = visibleChildren.some(child => child.url === currentPage || (currentPage === '' && child.url === 'index.html'));
      if (hasActiveChild) {
        group.classList.add('active-group');
        group.classList.add('open');
      }

      const sub = document.createElement('div');
      sub.className = 'menu-sub';
      if (hasActiveChild) sub.classList.add('show');

      visibleChildren.forEach(child => {
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
  if (item.ready && item.url && item.url !== '#') {
    const link = document.createElement('a');
    link.dataset.page = item.page;
    link.href = item.url;
    link.title = `${item.label} 페이지`;
    const isActive = item.url === currentPage || (currentPage === '' && item.url === 'index.html');
    if (isActive) link.classList.add('active');
    link.textContent = item.label;
    return link;
  }

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
