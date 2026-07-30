/* =====================================================
   cloud-sync.js - 클라우드 데이터 동기화 모듈
   localStorage + Cloudflare KV 양방향 동기화

   작동 방식:
   - 저장 시: localStorage 저장 + 클라우드 push (비동기)
   - 로드 시: localStorage 먼저 → 클라우드에서 최신 확인 → 교체
   - 충돌 처리: last-write-wins (타임스탬프 비교)
   ===================================================== */

const CloudSync = {
  enabled: false,
  apiKey: '',
  lastSyncTs: 0,
  syncing: false,
  _pollTimer: null,

  /** 초기화 - localStorage에서 API 키 복원 */
  init() {
    this.apiKey = localStorage.getItem('cloud_auth_key') || '';
    this.enabled = !!this.apiKey;
    this.lastSyncTs = parseInt(localStorage.getItem('cloud_last_sync') || '0', 10) || 0;

    if (this.enabled) {
      console.log('[CloudSync] 활성화됨 (마지막 동기화:', new Date(this.lastSyncTs).toLocaleString(), ')');
    }
  },

  /** API 키 설정 */
  setApiKey(key) {
    this.apiKey = key;
    this.enabled = !!key;
    if (key) {
      localStorage.setItem('cloud_auth_key', key);
      this.startAutoSync();
    } else {
      localStorage.removeItem('cloud_auth_key');
      this.stopAutoSync();
    }
  },

  /** 클라우드에서 데이터 가져오기 */
  async pull(key) {
    if (!this.enabled) return null;
    try {
      const res = await fetch(`/api/data?key=${encodeURIComponent(key)}`, {
        headers: { 'X-Auth-Key': this.apiKey }
      });
      if (!res.ok) {
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
  async push(key, data) {
    if (!this.enabled) return false;
    if (this.syncing) return false;
    this.syncing = true;

    try {
      const ts = Date.now();
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Key': this.apiKey
        },
        body: JSON.stringify({ key, data, ts })
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

      console.warn('[CloudSync] Push 실패:', res.status);
      return false;
    } catch (e) {
      console.warn('[CloudSync] Push 에러:', e.message);
      return false;
    } finally {
      this.syncing = false;
    }
  },

  /** 클라우드에서 최신 데이터를 가져와서 state와 병합 */
  async pullAndMerge(storageKey, currentCards, onUpdated) {
    if (!this.enabled) return;

    const cloudData = await this.pull(storageKey);
    if (!cloudData || !cloudData.data) return;

    // 클라우드가 더 최신이면 교체
    if (cloudData.ts > this.lastSyncTs) {
      console.log('[CloudSync] 클라우드에서 최신 데이터 발견');
      this.lastSyncTs = cloudData.ts;
      localStorage.setItem('cloud_last_sync', cloudData.ts.toString());

      // 콜백으로 데이터 교체 + 재렌더링
      if (typeof onUpdated === 'function') {
        onUpdated(cloudData.data);
      }
    }
  },

  /** 연결 테스트 */
  async testConnection() {
    if (!this.apiKey) return { ok: false, msg: 'API 키가 없어요' };
    try {
      const res = await fetch(`/api/data?key=__test__`, {
        headers: { 'X-Auth-Key': this.apiKey }
      });
      if (res.ok) return { ok: true, msg: '연결 성공!' };
      if (res.status === 401) return { ok: false, msg: 'API 키가 올바르지 않아요' };
      return { ok: false, msg: `서버 응답: ${res.status}` };
    } catch (e) {
      return { ok: false, msg: '연결 실패: ' + e.message };
    }
  },

  /** 동기화 상태 텍스트 */
  getStatusText() {
    if (!this.enabled) return '클라우드 동기화 끄짐';
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
