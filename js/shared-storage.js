/* =====================================================
   shared-storage.js - 서브페이지 공통 저장/불러오기 로직
   10개 서브페이지(smartstore, always, coupang, domagguk, elevenst,
   esm, nshipping, ownerclan, rocketgrowth, tossshopping)의
   storage 파일에서 중복되는 save/load/clean 패턴을 통합.
   각 페이지의 *-storage.js는 이 모듈의 제네릭 함수를 호출하는
   thin wrapper 역할만 수행한다.
   ===================================================== */

/**
 * 카드 배열을 localStorage에 저장 (백업 동시 갱신, 용량 초과 시 이미지 제거 후 재시도).
 * @param {Object} config - 페이지 CONFIG 객체 (STORAGE_KEY, IMAGE_REMOVE_ON_SAVE_FAIL, MESSAGES 포함)
 * @param {Object} state  - 페이지 state 객체 ({ cards: [] } 구조)
 * @returns {{ ok: boolean, imagesRemoved?: boolean, msg?: string }}
 */
function savePageData(config, state) {
  const storageKey = getUserScopedKey(config.STORAGE_KEY);
  // 먼저 이미지를 포함한 원본 데이터로 저장 시도
  try {
    const data = JSON.stringify(state.cards);
    localStorage.setItem(storageKey, data);
    try {
      localStorage.setItem(storageKey + '_backup', data);
    } catch (backupError) {
      console.warn('Backup save failed', backupError);
    }
    // 클라우드 동기화 (비동기, 실패 무시)
    if (typeof CloudSync !== 'undefined' && CloudSync.enabled) {
      CloudSync.pageKey = config.STORAGE_KEY;
      CloudSync.push(state.cards);
    }
    return { ok: true };
  } catch (e) {
    if (!isStorageQuotaError(e) || !config.IMAGE_REMOVE_ON_SAVE_FAIL) {
      return { ok: false, msg: config.MESSAGES.SAVE_FAIL + (e.message || '') };
    }
  }

  // 용량 초과 시 이미지 필드를 제거한 뒤 재시도
  const cleaned = cleanCardsForSave(state.cards);
  try {
    const data = JSON.stringify(cleaned);
    localStorage.setItem(storageKey, data);
    try {
      localStorage.setItem(storageKey + '_backup', data);
    } catch (backupError) {
      console.warn('Backup save failed', backupError);
    }
    // 메모리 상태도 이미지 없이 동기화 (다음 저장 시도 방지)
    state.cards = cleaned;
    // 클라우드 동기화 (비동기, 실패 무시)
    if (typeof CloudSync !== 'undefined' && CloudSync.enabled) {
      CloudSync.pageKey = config.STORAGE_KEY;
      CloudSync.push(state.cards);
    }
    return { ok: true, imagesRemoved: true };
  } catch (e2) {
    return { ok: false, msg: config.MESSAGES.SAVE_FAIL_QUOTA };
  }
}

/**
 * 저장용 데이터에서 이미지 필드 제거 (localStorage 용량 절약).
 * 카드 자체의 image와 복수품 bundleItems의 image를 모두 제거한다.
 * @param {Array} cards - 카드 배열
 * @returns {Array} 이미지가 제거된 카드 배열
 */
function cleanCardsForSave(cards) {
  return cards.map(c => {
    const cleaned = { ...c, image: '' };
    if (Array.isArray(c.bundleItems)) {
      cleaned.bundleItems = c.bundleItems.map(item => ({ ...item, image: '' }));
    }
    return cleaned;
  });
}

/**
 * localStorage에서 카드 데이터를 불러와 state.cards에 설정 (손상 시 백업 복구).
 * @param {Object} config          - 페이지 CONFIG 객체 (STORAGE_KEY, MESSAGES 포함)
 * @param {Object} state           - 페이지 state 객체 ({ cards: [] } 구조)
 * @param {Function} newCardFn     - 새 카드 기본값 생성 함수 (예: newSmartstoreCard)
 * @param {Function} newBundleItemFn - 새 복수품 항목 기본값 생성 함수 (예: newBundleItem)
 */
function loadPageData(config, state, newCardFn, newBundleItemFn) {
  try {
    const storageKey = migrateLegacyKeyToUserScope(config.STORAGE_KEY, Array.isArray);
    let raw = localStorage.getItem(storageKey);
    let data = null;

    if (raw) {
      try { data = JSON.parse(raw); } catch (e) { data = null; }
    }

    if (!Array.isArray(data)) {
      const backupRaw = localStorage.getItem(storageKey + '_backup');
      if (backupRaw) {
        try { data = JSON.parse(backupRaw); } catch (e) { data = null; }
      }
    }

    if (!Array.isArray(data)) return;

    state.cards = data.filter(c => c && typeof c === 'object').map(c => {
      const defaults = newCardFn();
      const bundleItems = (Array.isArray(c.bundleItems) ? c.bundleItems : [])
        .filter(item => item && typeof item === 'object')
        .map(item => ({ ...newBundleItemFn(), ...item, id: item.id || generateId() }));

      const card = {
        ...defaults,
        ...c,
        id: c.id || defaults.id,
        isEditing: typeof c.isEditing === 'boolean' ? c.isEditing : false,
        isCollapsed: typeof c.isCollapsed === 'boolean' ? c.isCollapsed : false,
        isBundle: typeof c.isBundle === 'boolean' ? c.isBundle : false,
        bundleItems: bundleItems
      };
      // 이미지는 사용자가 직접 업로드한 경우에만 존재하며, 마켓노트 실시간 조회값은 저장하지 않음
      card.image = c.image || '';
      card.bundleItems.forEach(item => { item.image = item.image || ''; });
      return card;
    });
  } catch (e) {
    console.warn(config.MESSAGES.LOAD_FAIL, e);
  }
}

/**
 * 마켓노트 페이지의 데이터를 localStorage에서 읽어오기.
 * @param {Object} config - 페이지 CONFIG 객체 (PRODUCTLIST_STORAGE_KEY 포함)
 * @returns {Array} 마켓노트 데이터 배열 (없으면 빈 배열)
 */
function loadProductlistDataForPage(config) {
  try {
    const raw = getUserScopedItemWithFallback(config.PRODUCTLIST_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('마켓노트 데이터 읽기 실패', e);
    return [];
  }
}

/**
 * 서브페이지용 클라우드 풀 - 클라우드에서 최신 데이터를 가져와 state.cards 교체 + 재렌더.
 * main 페이지의 cloudPullAndRender와 동일한 로직이지만 데이터 마이그레이션이 새 카드 생성 함수를 받음.
 * @param {Object} config - 페이지 CONFIG
 * @param {Object} state  - 페이지 state ({ cards: [] })
 * @param {Function} newCardFn - 새 카드 기본값 생성 함수
 * @param {Function} renderFn - 렌더링 함수 (예: renderNshipping)
 */
async function cloudPullAndRenderPage(config, state, newCardFn, renderFn) {
  if (!CloudSync.enabled) return;

  // 페이지 키를 해당 페이지의 STORAGE_KEY로 설정
  CloudSync.pageKey = config.STORAGE_KEY;

  const cloudData = await CloudSync.pull();
  if (!cloudData) return;

  // 클라우드 데이터가 비어있으면 (계정 삭제 후 재가입 등) localStorage도 정리
  if (!cloudData.data || !Array.isArray(cloudData.data)) {
    const storageKey = getUserScopedKey(config.STORAGE_KEY);
    const hadLocal = !!localStorage.getItem(storageKey);
    if (hadLocal) {
      console.log('[CloudSync:' + config.STORAGE_KEY + '] 서버에 데이터 없음 → localStorage 정리');
      state.cards = [];
      try {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(storageKey + '_backup');
      } catch (e) { /* ignore */ }
      CloudSync.lastSyncTs = 0;
      try { localStorage.setItem(getSyncKey(config.STORAGE_KEY), '0'); } catch (e) { /* ignore */ }
      renderFn();
      if (typeof showToast === 'function') {
        const toastFlag = 'clearStaleToastShown_' + (Auth.username || '');
        if (!sessionStorage.getItem(toastFlag)) {
          sessionStorage.setItem(toastFlag, '1');
          showToast('☁️ 서버에 데이터가 없어 초기화했어요');
        }
      }
    }
    return;
  }

  // 클라우드가 더 최신이면 교체
  if (cloudData.ts > CloudSync.lastSyncTs) {
    console.log('[CloudSync:' + config.STORAGE_KEY + '] 클라우드에서 최신 데이터 로드');
    CloudSync.lastSyncTs = cloudData.ts;
    localStorage.setItem(getSyncKey(config.STORAGE_KEY), cloudData.ts.toString());

    // 데이터 마이그레이션 (loadPageData와 동일)
    state.cards = cloudData.data.filter(c => c && typeof c === 'object').map(c => {
      const defaults = newCardFn();
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
      const storageKey = getUserScopedKey(config.STORAGE_KEY);
      localStorage.setItem(storageKey, JSON.stringify(state.cards));
    } catch (e) { /* ignore */ }

    renderFn();
    if (typeof showToast === 'function') {
      showToast('☁️ 클라우드에서 최신 데이터를 불러왔어요');
    }
  }
}

/**
 * 서브페이지용 자동 동기화 시작 (10초 폴링).
 * @param {Object} config - 페이지 CONFIG
 * @param {Object} state  - 페이지 state ({ cards: [] })
 * @param {Function} newCardFn - 새 카드 기본값 생성 함수
 * @param {Function} renderFn - 렌더링 함수
 * @param {number} [intervalMs=10000] 폴링 간격
 */
function startPageAutoSync(config, state, newCardFn, renderFn, intervalMs = 10000) {
  CloudSync.stopAutoSync();
  if (!CloudSync.enabled) return;
  CloudSync.pageKey = config.STORAGE_KEY;

  CloudSync._pollTimer = setInterval(async () => {
    if (!CloudSync.enabled || CloudSync.syncing) return;

    // 사용자가 편집 중이면 건너뜀 (덮어쓰기 방지)
    if (state.cards && state.cards.some(c => c.isEditing)) return;

    await cloudPullAndRenderPage(config, state, newCardFn, renderFn);
  }, intervalMs);

  console.log('[CloudSync:' + config.STORAGE_KEY + '] 자동 동기화 시작 (' + (intervalMs / 1000) + '초 간격)');
}

/**
 * 서브페이지용 수동 클라우드 동기화 (버튼).
 * @param {Object} config - 페이지 CONFIG
 * @param {Object} state  - 페이지 state
 * @param {Function} newCardFn - 새 카드 기본값 생성 함수
 * @param {Function} renderFn - 렌더링 함수
 */
async function manualCloudSyncPage(config, state, newCardFn, renderFn) {
  if (!CloudSync.enabled) {
    if (typeof showToast === 'function') showToast('로그인이 필요합니다');
    return;
  }

  if (typeof showToast === 'function') showToast('☁️ 동기화 중...');

  // 1. 클라우드에서 최신 확인
  await cloudPullAndRenderPage(config, state, newCardFn, renderFn);

  // 2. 현재 데이터를 클라우드에 push
  CloudSync.pageKey = config.STORAGE_KEY;
  const ok = await CloudSync.push(state.cards);

  if (ok) {
    if (typeof showToast === 'function') showToast('☁️ 동기화 완료!');
  } else {
    if (typeof showToast === 'function') showToast('❌ 동기화 실패');
  }
}
