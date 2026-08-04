/* =====================================================
   cloud-sync.js - 클라우드 데이터 동기화 모듈 (세션 기반)
   localStorage + Cloudflare KV 양방향 동기화

   작동 방식:
   - 저장 시: localStorage 저장 + 클라우드 push (비동기)
   - 로드 시: localStorage 먼저 → 클라우드에서 최신 확인 → 교체
   - 충돌 처리: last-write-wins (타임스탬프 비교)
   - 인증: Auth.token (Bearer 토큰)
   ===================================================== */

const CloudSync = {
  enabled: false,
  lastSyncTs: 0,
  syncing: false,
  pendingPushData: null,
  _pollTimer: null,

  /** 초기화 - 인증 상태 확인 */
  init() {
    this.lastSyncTs = parseInt(localStorage.getItem(getSyncKey()) || '0', 10) || 0;
    this.enabled = Auth.isAuthenticated();

    if (this.enabled) {
      console.log('[CloudSync] 활성화됨 (사용자:', Auth.username, ')');
    }
  },

  /** 클라우드에서 데이터 가져오기 */
  async pull() {
    if (!this.enabled || !Auth.token) return null;
    try {
      const res = await fetch('/api/data', {
        headers: { 'Authorization': `Bearer ${Auth.token}` }
      });
      if (!res.ok) {
        if (res.status === 401) {
          console.warn('[CloudSync] 세션 만료');
          await Auth.logout();
          location.reload();
          return null;
        }
        console.warn('[CloudSync] Pull 실패:', res.status);
        return null;
      }
      return await res.json();
    } catch (e) {
      console.warn('[CloudSync] Pull 에러:', e.message);
      return null;
    }
  },

  /** 클라우드에 데이터 저장 */
  async push(data) {
    if (!this.enabled || !Auth.token) return false;
    if (this.syncing) {
      this.pendingPushData = data;
      return false;
    }
    this.syncing = true;

    try {
      const ts = Date.now();
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Auth.token}`
        },
        body: JSON.stringify({ data, ts })
      });

      if (res.ok) {
        this.lastSyncTs = ts;
        localStorage.setItem(getSyncKey(), ts.toString());
        return true;
      }

      // 409: 클라우드가 더 최신 → pull 필요
      if (res.status === 409) {
        const body = await res.json();
        console.warn('[CloudSync] 클라우드가 더 최신:', new Date(body.cloudTs).toLocaleString());
        return false;
      }

      // 401: 세션 만료
      if (res.status === 401) {
        console.warn('[CloudSync] 세션 만료');
        await Auth.logout();
        location.reload();
        return false;
      }

      console.warn('[CloudSync] Push 실패:', res.status);
      return false;
    } catch (e) {
      console.warn('[CloudSync] Push 에러:', e.message);
      return false;
    } finally {
      this.syncing = false;
      if (this.pendingPushData) {
        const pending = this.pendingPushData;
        this.pendingPushData = null;
        this.push(pending);
      }
    }
  },

  /** 동기화 상태 텍스트 */
  getStatusText() {
    if (!this.enabled) return '동기화 끄짐';
    if (!this.lastSyncTs) return '동기화 전';
    const date = new Date(this.lastSyncTs);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '방금 동기화됨';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전 동기화`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전 동기화`;
    return date.toLocaleDateString() + ' 동기화';
  },

  /** 자동 동기화 시작 (폴링) */
  startAutoSync(intervalMs = 10000) {
    this.stopAutoSync();
    if (!this.enabled) return;

    this._pollTimer = setInterval(async () => {
      if (!this.enabled || this.syncing) return;

      // 사용자가 편집 중이면 건너뜀 (덮어쓰기 방지)
      if (typeof state !== 'undefined' && state.cards) {
        const isEditing = state.cards.some(c => c.isEditing);
        if (isEditing) return;
      }

      // 클라우드에서 당겨오기
      if (typeof cloudPullAndRender === 'function') {
        await cloudPullAndRender();
      }
    }, intervalMs);

    console.log(`[CloudSync] 자동 동기화 시작 (${intervalMs / 1000}초 간격)`);
  },

  /** 자동 동기화 중지 */
  stopAutoSync() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
      console.log('[CloudSync] 자동 동기화 중지');
    }
  }
};

/**
 * 서버 메인 데이터가 비어있고 (계정 신규/삭제된 상태) 해당 페이지의 localStorage에
 * 데이터가 남아있으면 정리. N배송/쿠팡/도매꾹 등 각 페이지 진입 시 한 번 호출.
 *
 * 주의: 메인 페이지의 data:<username> KV 값을 사용함.
 *   - ts > 0 이거나 data가 비어있지 않으면 → 사용 중인 계정이므로 정리하지 않음
 *   - ts === 0 이고 data가 비어있으면 → 계정이 신규 또는 삭제된 상태이므로
 *     user-scoped localStorage 키와 legacy 글로벌 키를 모두 삭제
 *
 * @param {string|string[]} baseKey 페이지의 base storage key (예: 'nshipping_v1').
 *        배열로 여러 키를 전달하면 한 번의 API 호출로 모두 정리 (예: 페이지 자체 키 + productlist_v1)
 * @returns {Promise<boolean>} 정리했으면 true
 */
async function clearStalePageDataIfServerEmpty(baseKey) {
  // 인증 토큰을 localStorage/sessionStorage에서 직접 읽음 (Auth 전역 객체 의존 X)
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  const username = localStorage.getItem('auth_username') || sessionStorage.getItem('auth_username');
  if (!token || !username) return false;
  try {
    const res = await fetch('/api/data', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return false;
    const result = await res.json();
    if (!result.ok || !result.data) return false;

    const cloudData = result.data.data;
    const cloudTs = result.data.ts || 0;
    const hasCloudData = cloudData && Array.isArray(cloudData) && cloudData.length > 0;

    // 서버에 사용자의 메인 데이터가 있으면 → 정상 사용 중인 계정. 정리 안 함.
    if (hasCloudData || cloudTs !== 0) return false;

    // baseKey가 문자열이면 배열로 변환
    const keys = Array.isArray(baseKey) ? baseKey : [baseKey];

    let cleared = false;
    for (const key of keys) {
      const scopedKey = key + '_' + username;
      const backupKey = scopedKey + '_backup';
      const legacyKey = key;
      const legacyBackupKey = key + '_backup';

      if (localStorage.getItem(scopedKey)) {
        localStorage.removeItem(scopedKey);
        localStorage.removeItem(backupKey);
        cleared = true;
      }
      if (localStorage.getItem(legacyKey)) {
        localStorage.removeItem(legacyKey);
        localStorage.removeItem(legacyBackupKey);
        cleared = true;
      }
    }
    if (cleared && typeof showToast === 'function') {
      showToast('서버에 데이터가 없어 초기화했어요');
    }
    return cleared;
  } catch (e) {
    console.warn('[clearStalePageDataIfServerEmpty] 실패:', e.message);
    return false;
  }
}
