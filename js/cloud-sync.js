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
  _pollTimer: null,

  /** 초기화 - 인증 상태 확인 */
  init() {
    this.lastSyncTs = parseInt(localStorage.getItem('cloud_last_sync') || '0', 10) || 0;
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
    if (this.syncing) return false;
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
        localStorage.setItem('cloud_last_sync', ts.toString());
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
