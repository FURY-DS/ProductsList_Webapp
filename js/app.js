/* =====================================================
   app.js - 앱 초기화, 키보드 단축키, 부팅
   ===================================================== */

/** DOM 로드 후 각 모듈 초기화 */
function init() {
  initToast();
  initModal();
  initBoard();
  initSearch();
  initMenu();
  initActions();
  initRateBulk();

  // 클라우드 동기화 초기화
  CloudSync.init();
  initCloudSyncButton();

  // 자동 동기화 시작 (10초 간격 폴링)
  CloudSync.startAutoSync(10000);

  // 탭이 다시 활성화될 때 즉시 pull
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && CloudSync.enabled) {
      cloudPullAndRender();
    }
  });

  bindKeyboardShortcuts();

  // 데이터 로드
  load();

  // 첫 실행 시 카드 1개 생성
  if (state.cards.length === 0) {
    state.cards.push(newCard());
  }

  // 첫 렌더링
  render();

  // 클라우드에서 최신 데이터 확인 (백그라운드)
  cloudPullAndRender();
}

/** 클라우드에서 최신 데이터를 가져와서 교체 + 재렌더링 */
async function cloudPullAndRender() {
  if (!CloudSync.enabled) return;

  const cloudData = await CloudSync.pull(CONFIG.STORAGE_KEY);
  if (!cloudData || !cloudData.data || !Array.isArray(cloudData.data)) return;

  // 클라우드가 더 최신이면 교체
  if (cloudData.ts > CloudSync.lastSyncTs) {
    console.log('[CloudSync] 클라우드에서 최신 데이터 로드');
    CloudSync.lastSyncTs = cloudData.ts;
    localStorage.setItem('cloud_last_sync', cloudData.ts.toString());

    // 데이터 마이그레이션 (기존 load() 로직과 동일)
    state.cards = cloudData.data.filter(c => c && typeof c === 'object').map(c => {
      const defaults = newCard();
      return {
        ...defaults,
        ...c,
        id: c.id || defaults.id,
        isEditing: typeof c.isEditing === 'boolean' ? c.isEditing : false,
        isCollapsed: typeof c.isCollapsed === 'boolean' ? c.isCollapsed : false,
        image: c.image || ''
      };
    });

    // localStorage에도 저장
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.cards));
    } catch (e) { /* ignore */ }

    render();
    if (typeof showToast === 'function') {
      showToast('☁️ 클라우드에서 최신 데이터를 불러왔어요');
    }
  }
}

/** 헤더에 클라우드 동기화 설정 버튼 초기화 */
function initCloudSyncButton() {
  const btn = document.getElementById('btn-cloud-sync');
  if (!btn) return;

  updateCloudSyncButton();

  btn.addEventListener('click', openCloudSyncModal);

  // 모달 내부 버튼 바인딩
  const closeBtn = document.getElementById('cloud-sync-close');
  if (closeBtn) closeBtn.addEventListener('click', closeCloudSyncModal);

  const saveBtn = document.getElementById('cloud-sync-save');
  if (saveBtn) saveBtn.addEventListener('click', saveCloudSyncSettings);

  const manualBtn = document.getElementById('cloud-sync-manual');
  if (manualBtn) manualBtn.addEventListener('click', manualCloudSync);

  // 배경 클릭 시 닫기
  const modal = document.getElementById('cloud-sync-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCloudSyncModal();
    });
  }
}

/** 클라우드 동기화 버튼 상태 업데이트 */
function updateCloudSyncButton() {
  const btn = document.getElementById('btn-cloud-sync');
  if (!btn) return;

  if (CloudSync.enabled) {
    btn.classList.add('active');
    btn.title = CloudSync.getStatusText();
  } else {
    btn.classList.remove('active');
    btn.title = '클라우드 동기화 설정';
  }
}

/** 클라우드 동기화 설정 모달 열기 */
function openCloudSyncModal() {
  const modal = document.getElementById('cloud-sync-modal');
  if (!modal) return;

  // 현재 상태 표시
  const statusEl = document.getElementById('cloud-sync-status');
  if (statusEl) {
    statusEl.textContent = CloudSync.getStatusText();
  }

  // API 키 입력 필드
  const keyInput = document.getElementById('cloud-api-key');
  if (keyInput) {
    keyInput.value = CloudSync.apiKey || '';
  }

  modal.style.display = 'flex';
}

/** 클라우드 동기화 설정 모달 닫기 */
function closeCloudSyncModal() {
  const modal = document.getElementById('cloud-sync-modal');
  if (modal) modal.style.display = 'none';
}

/** 클라우드 동기화 저장 (API 키 적용) */
async function saveCloudSyncSettings() {
  const keyInput = document.getElementById('cloud-api-key');
  const key = keyInput ? keyInput.value.trim() : '';

  if (key) {
    CloudSync.setApiKey(key);

    // 연결 테스트
    const result = await CloudSync.testConnection();
    if (result.ok) {
      showToast('☁️ 클라우드 동기화가 켜졌어요!');
      closeCloudSyncModal();

      // 즉시 클라우드에서 데이터 pull
      cloudPullAndRender();
    } else {
      showToast('❌ ' + result.msg);
      // 키는 저장하되, 에러 메시지 표시
    }
  } else {
    CloudSync.setApiKey('');
    showToast('클라우드 동기화를 껐어요');
    closeCloudSyncModal();
  }

  updateCloudSyncButton();
}

/** 수동 클라우드 동기화 (버튼) */
async function manualCloudSync() {
  if (!CloudSync.enabled) {
    showToast('먼저 API 키를 입력해주세요');
    return;
  }

  showToast('☁️ 동기화 중...');

  // 1. 클라우드에서 최신 확인
  await cloudPullAndRender();

  // 2. 현재 데이터를 클라우드에 push
  const ok = await CloudSync.push(CONFIG.STORAGE_KEY, state.cards);

  if (ok) {
    showToast('☁️ 동기화 완료!');
    updateCloudSyncButton();
    const statusEl = document.getElementById('cloud-sync-status');
    if (statusEl) statusEl.textContent = CloudSync.getStatusText();
  } else {
    showToast('❌ 동기화 실패. 네트워크를 확인해주세요.');
  }
}

/** 키보드 단축키 바인딩 */
function bindKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // ESC: 드롭다운 / 모달 닫기
    if (e.key === 'Escape') {
      if (isMenuOpen()) {
        toggleMenu(false);
        return;
      }
      if (isModalOpen()) {
        closeModal();
        return;
      }
    }

    // Ctrl/Cmd + S: 수동 저장
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      reportSaveResult(save(), CONFIG.MESSAGES, CONFIG.MESSAGES.SAVED);
    }

    // Ctrl/Cmd + F: 검색창 포커스
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.focus();
    }
  });
}

// DOM 준비되면 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
