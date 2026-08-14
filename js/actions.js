/* =====================================================
   actions.js - 상단 액션 버튼 (내보내기 / 가져오기 / 전체삭제)
   ===================================================== */

const ALL_PAGES = [
  { id: 'productlist',  key: 'productlist_v1',  name: '마켓노트' },
  { id: 'nshipping',    key: 'nshipping_v1',    name: 'N배송' },
  { id: 'rocketgrowth', key: 'rocketgrowth_v1', name: '로켓그로스' },
  { id: 'smartstore',   key: 'smartstore_v1',   name: '스마트스토어' },
  { id: 'coupang',      key: 'coupang_v1',      name: '쿠팡' },
  { id: 'esm',          key: 'esm_v1',          name: 'ESM' },
  { id: 'elevenst',     key: 'elevenst_v1',     name: '11번가' },
  { id: 'ownerclan',    key: 'ownerclan_v1',    name: '오너클랜' },
  { id: 'domagguk',     key: 'domagguk_v1',     name: '도매꾹' },
  { id: 'always',       key: 'always_v1',       name: '올웨이즈' },
  { id: 'tossshopping', key: 'tossshopping_v1', name: '토스쇼핑' }
];

/** 액션 버튼 초기화 (DOM 로드 후 호출) */
function initActions() {
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-import').addEventListener('click', importData);
  document.getElementById('import-input').addEventListener('change', handleImportFile);
  document.getElementById('btn-export-all').addEventListener('click', exportAllData);
  document.getElementById('btn-import-all').addEventListener('click', importAllData);
  document.getElementById('import-all-input').addEventListener('change', handleImportAllFile);
  document.getElementById('btn-csv-template').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleExcelDropdown(false);
    downloadCsvTemplate();
  });
  document.getElementById('btn-csv-import').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleExcelDropdown(false);
    importCsvData();
  });
  document.getElementById('csv-import-input').addEventListener('change', handleCsvImportFile);
  initExcelDropdown();
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  document.getElementById('btn-rate-bulk').addEventListener('click', openRateBulkModal);
  document.getElementById('btn-percent-bulk').addEventListener('click', openPctBulkModal);
}

/** Excel 드롭다운 초기화 */
function initExcelDropdown() {
  const btn = document.getElementById('btn-excel');
  const wrapper = document.getElementById('excel-dropdown-wrapper');
  if (!btn || !wrapper) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleExcelDropdown();
  });

  // 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#excel-dropdown-wrapper')) {
      toggleExcelDropdown(false);
    }
  });
}

/** Excel 드롭다운 토글 (true/false 지정 또는 토글) */
function toggleExcelDropdown(show) {
  const dropdown = document.getElementById('excel-dropdown');
  if (!dropdown) return;
  if (typeof show === 'boolean') {
    dropdown.classList.toggle('show', show);
  } else {
    dropdown.classList.toggle('show');
  }
}

/** 전체 데이터 내보내기 (마켓노트 + 마켓플레이스) */
function exportAllData() {
  try {
    const pages = {};
    let exportedCount = 0;
    ALL_PAGES.forEach(p => {
      // 사용자별 키(`<key>_<username>`)를 우선 읽고, 없으면 기존 전역 키(`<key>`)에서 fallback.
      // 단순히 localStorage.getItem(p.key)만 쓰면 실제 데이터가 있는 user-scoped 키를
      // 놓쳐서 빈 export가 만들어짐.
      const raw = typeof getUserScopedItemWithFallback === 'function'
        ? getUserScopedItemWithFallback(p.key)
        : localStorage.getItem(p.key);
      if (raw === null) return;
      let data;
      try { data = JSON.parse(raw); } catch (e) { data = raw; }
      pages[p.id] = { key: p.key, name: p.name, data };
      exportedCount++;
    });

    const payload = {
      _exportType: 'all',
      _exportVersion: 1,
      exportDate: new Date().toISOString(),
      pages
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `전체데이터_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(CONFIG.MESSAGES.EXPORT_ALL_DONE || `${exportedCount}개 페이지 데이터를 내보내기 완료`);
  } catch (err) {
    showToast((CONFIG.MESSAGES.EXPORT_ALL_FAIL || '전체 내보내기 실패: ') + err.message);
  }
}

/** 전체 데이터 가져오기 파일 선택 */
function importAllData() {
  document.getElementById('import-all-input').click();
}

/** 전체 데이터 가져오기 처리 */
function handleImportAllFile(e) {
  const f = e.target.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!parsed || parsed._exportType !== 'all' || typeof parsed.pages !== 'object') {
        throw new Error(CONFIG.MESSAGES.IMPORT_ALL_WRONG_FILE || '올바른 전체 데이터 파일이 아니에요');
      }

      const pageEntries = Object.entries(parsed.pages).filter(([id, p]) => {
        return p && typeof p === 'object' && ALL_PAGES.some(ap => ap.id === id);
      });
      if (pageEntries.length === 0) {
        throw new Error('가져올 페이지 데이터가 없어요');
      }

      showModal({
        title: CONFIG.MESSAGES.IMPORT_ALL_TITLE || '전체 가져오기',
        text: CONFIG.MESSAGES.IMPORT_ALL_TEXT
          ? CONFIG.MESSAGES.IMPORT_ALL_TEXT(pageEntries.length)
          : `총 ${pageEntries.length}개 페이지 데이터를 교체할까요?\n기존 데이터는 덮어써져요.`,
        confirmText: '교체',
        onConfirm: () => {
          let applied = 0;
          pageEntries.forEach(([id, p]) => {
            const cfg = ALL_PAGES.find(ap => ap.id === id);
            if (!cfg) return;
            const value = typeof p.data === 'string' ? p.data : JSON.stringify(p.data);
            // 사용자별 키(`<key>_<username>`)에 저장해야 앱이 실제로 읽음.
            // 단순히 localStorage.setItem(cfg.key, value)만 쓰면 legacy 글로벌 키에만
            // 저장되어 새 데이터가 보이지 않음. 호환을 위해 legacy 키도 같이 업데이트.
            const writeKeys = (typeof getUserScopedKey === 'function'
              ? [getUserScopedKey(cfg.key), cfg.key]
              : [cfg.key]);
            // 중복 방지
            const uniqKeys = Array.from(new Set(writeKeys));
            try {
              uniqKeys.forEach(k => {
                localStorage.setItem(k, value);
                try { localStorage.setItem(k + '_backup', value); } catch (e) { /* ignore */ }
              });
              applied++;

              // 현재 마켓노트 페이지라면 상태도 바로 갱신 + 클라우드 동기화
              if (id === 'productlist') {
                let arr;
                try { arr = JSON.parse(value); } catch (e) { arr = []; }
                if (!Array.isArray(arr)) arr = [];
                state.cards = arr.filter(c => c && typeof c === 'object').map(c => {
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
                // 클라우드에 새 데이터 반영 (save()는 사용자에게 토스트를 띄우므로 직접 push)
                if (typeof save === 'function') {
                  save();
                } else if (typeof CloudSync !== 'undefined' && CloudSync.enabled) {
                  CloudSync.push(state.cards);
                }
              }
            } catch (err) {
              console.warn(`Failed to write ${cfg.key}`, err);
            }
          });
          render();
          showToast(CONFIG.MESSAGES.IMPORT_ALL_DONE
            ? CONFIG.MESSAGES.IMPORT_ALL_DONE(applied)
            : `${applied}개 페이지 데이터를 가져왔어요`);
        }
      });
    } catch (err) {
      showToast((CONFIG.MESSAGES.IMPORT_ALL_FAIL || '전체 가져오기 실패: ') + err.message);
    }
  };
  r.readAsText(f);
  e.target.value = '';
}

/** JSON 파일로 데이터 내보내기 */
function exportData() {
  try {
    const exportData = { _page: CONFIG.PAGE_ID, data: state.cards };
    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `마켓노트_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(CONFIG.MESSAGES.EXPORT_DONE);
  } catch (err) {
    showToast(CONFIG.MESSAGES.EXPORT_FAIL + err.message);
  }
}

/** 파일 선택 다이얼로그 열기 */
function importData() {
  document.getElementById('import-input').click();
}

/** 가져오기 파일 처리 */
function handleImportFile(e) {
  const f = e.target.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      let data;

      // 새 형식: { _page: 'productlist', data: [...] }
      if (parsed && !Array.isArray(parsed) && parsed._page && parsed.data) {
        if (parsed._page !== CONFIG.PAGE_ID) {
          showToast(CONFIG.MESSAGES.IMPORT_WRONG_PAGE(parsed._page));
          return;
        }
        data = parsed.data;
      }
      // 기존 형식 (래핑 없는 배열): 허용
      else if (Array.isArray(parsed)) {
        data = parsed;
      }
      else {
        throw new Error('형식이 올바르지 않아요');
      }

      if (!Array.isArray(data)) throw new Error('형식이 올바르지 않아요');

      // id 보정: 없는 필드는 기본값으로 채움 (다른 6개 페이지와 동일한 패턴)
      const correctedData = data.filter(c => c && typeof c === 'object').map(c => {
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

      // 교체 확인 모달
      showModal({
        title: CONFIG.MESSAGES.IMPORT_TITLE,
        text: CONFIG.MESSAGES.IMPORT_TEXT(state.cards.length),
        onConfirm: () => {
          state.cards = correctedData;
          const result = save();
          render();
          reportSaveResult(result, CONFIG.MESSAGES, CONFIG.MESSAGES.IMPORT_DONE(correctedData.length));
        }
      });

      // 취소 시 추가 모드로 전환 (한 번만)
      const cancelBtn = document.getElementById('modal-cancel');
      const onceHandler = () => {
        cancelBtn.removeEventListener('click', onceHandler);
        state.cards = state.cards.concat(correctedData);
        const result = save();
        render();
        reportSaveResult(result, CONFIG.MESSAGES, CONFIG.MESSAGES.IMPORT_ADDED(correctedData.length));
      };
      cancelBtn.addEventListener('click', onceHandler, { once: true });
    } catch (err) {
      showToast(CONFIG.MESSAGES.IMPORT_FAIL + err.message);
    }
  };
  r.readAsText(f);
  e.target.value = '';
}

/* =====================================================
   CSV (엑셀) 템플릿 다운로드 및 가져오기
   ===================================================== */

/** CSV 템플릿 다운로드 */
function downloadCsvTemplate() {
  const BOM = '\uFEFF';
  const headers = CONFIG.CSV_COLUMNS.map(c => c.header);

  // 예시 데이터 2행
  const examples = [
    ['가방', '블랙', '중국', '진행중', '15', '215', '0.16', 'https://example.com/1', 'https://example.com/2', 'R001', 'N001', 'P001', 'NY001'],
    ['신발', '화이트 270', '베트남', '예정', '30', '215', '0.18', '', '', 'R002', 'N002', 'P002', 'NY002']
  ];

  const rows = [headers, ...examples];
  const csv = BOM + rows.map(row =>
    row.map(cell => {
      // 쉼표나 따옴표가 있으면 따옴표로 감싸고 내부 따옴표는 ""로 이스케이프
      const s = String(cell);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(',')
  ).join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '마켓노트_템플릿.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast(CONFIG.MESSAGES.CSV_TEMPLATE_DONE);
}

/** 엑셀 가져오기 파일 선택 다이얼로그 열기 */
function importCsvData() {
  document.getElementById('csv-import-input').click();
}

/** CSV 파일 파싱 (RFC 4180 준수) */
function parseCsv(text) {
  // BOM 제거
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        cell += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
        i++;
      } else if (ch === '\r') {
        // \r\n 또는 \r 단독
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        if (text[i + 1] === '\n') i += 2;
        else i++;
      } else if (ch === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        i++;
      } else {
        cell += ch;
        i++;
      }
    }
  }

  // 마지막 셀/행 처리
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

/** CSV 가져오기 파일 처리 */
function handleCsvImportFile(e) {
  const f = e.target.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = (ev) => {
    try {
      // UTF-8 먼저 시도, 실패 시 CP949(EUC-KR) 폴백 — 한국 엑셀 기본 인코딩 대응
      const buffer = ev.target.result;
      let text = new TextDecoder('utf-8').decode(buffer);
      if (text.includes('\uFFFD')) {
        text = new TextDecoder('euc-kr').decode(buffer);
      }
      const rows = parseCsv(text);

      if (rows.length < 2) {
        showToast(CONFIG.MESSAGES.CSV_EMPTY);
        return;
      }

      // 헤더 검증: 첫 행의 각 헤더가 CSV_COLUMNS에 있는지 확인
      const headerRow = rows[0].map(h => h.trim());
      const headerMap = {};
      let headerMatched = false;

      headerRow.forEach((h, idx) => {
        const col = CONFIG.CSV_COLUMNS.find(c => c.header === h);
        if (col) {
          headerMap[idx] = col.key;
          headerMatched = true;
        }
      });

      // 헤더가 매칭되지 않으면 첫 행을 헤더로 간주하고 위치 기반 매핑 사용
      if (!headerMatched) {
        CONFIG.CSV_COLUMNS.forEach((col, idx) => {
          headerMap[idx] = col.key;
        });
      }

      // 데이터 행 변환 (첫 행은 헤더로 건너뜀)
      const cards = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        // 완전히 빈 행은 건너뜀
        if (row.every(c => c.trim() === '')) continue;

        const card = newCard();
        card.isEditing = false; // 엑셀로 가져온 카드는 수정 모드 해제

        Object.keys(headerMap).forEach(idx => {
          const key = headerMap[idx];
          const val = (row[idx] || '').trim();
          card[key] = val;
        });

        cards.push(card);
      }

      if (cards.length === 0) {
        showToast(CONFIG.MESSAGES.CSV_EMPTY);
        return;
      }

      // 교체 확인 모달
      showModal({
        title: CONFIG.MESSAGES.CSV_IMPORT_TITLE,
        text: CONFIG.MESSAGES.CSV_IMPORT_TEXT(cards.length, state.cards.length),
        confirmText: '교체',
        onConfirm: () => {
          state.cards = cards;
          const result = save();
          render();
          reportSaveResult(result, CONFIG.MESSAGES, CONFIG.MESSAGES.CSV_IMPORT_DONE(cards.length));
        }
      });

      // 취소 시 추가 모드
      const cancelBtn = document.getElementById('modal-cancel');
      const onceHandler = () => {
        cancelBtn.removeEventListener('click', onceHandler);
        state.cards = state.cards.concat(cards);
        const result = save();
        render();
        reportSaveResult(result, CONFIG.MESSAGES, CONFIG.MESSAGES.CSV_IMPORT_ADDED(cards.length));
      };
      cancelBtn.addEventListener('click', onceHandler, { once: true });

    } catch (err) {
      showToast(CONFIG.MESSAGES.CSV_IMPORT_FAIL + err.message);
    }
  };
  r.readAsArrayBuffer(f);
  e.target.value = '';
}

/** 전체 삭제 */
function clearAll() {
  if (state.cards.length === 0) {
    showToast(CONFIG.MESSAGES.NOTHING_DELETE);
    return;
  }
  showModal({
    title: CONFIG.MESSAGES.CLEAR_TITLE,
    text: CONFIG.MESSAGES.CLEAR_TEXT(state.cards.length),
    confirmText: '삭제',
    onConfirm: () => {
      state.cards = [];
      const result = save();
      render();
      reportSaveResult(result, CONFIG.MESSAGES, CONFIG.MESSAGES.ALL_DELETED);
    }
  });
}

/** 개별 카드 삭제 확인 */
function confirmDelete(cardId) {
  const card = findCard(cardId);
  if (!card) return;
  const label = card.name ? `"${card.name}"` : '이 상품';
  showModal({
    title: CONFIG.MESSAGES.DELETE_TITLE,
    text: CONFIG.MESSAGES.DELETE_TEXT(label),
    confirmText: '삭제',
    onConfirm: () => {
      state.cards = state.cards.filter(c => c.id !== cardId);
      const result = save();
      render();
      reportSaveResult(result, CONFIG.MESSAGES, CONFIG.MESSAGES.DELETED);
    }
  });
}

/** 새 카드 추가 (보드 끝) */
function addCard() {
  const c = newCard();
  state.cards.push(c);
  reportSaveResult(save(), CONFIG.MESSAGES);
  render();
  scrollToCard(c.id);
}

/** 특정 카드 바로 뒤에 새 카드 추가 */
function addCardAfter(cardId) {
  const idx = findCardIndex(cardId);
  const c = newCard();
  if (idx < 0) {
    state.cards.push(c);
  } else {
    state.cards.splice(idx + 1, 0, c);
  }
  reportSaveResult(save(), CONFIG.MESSAGES);
  render();
  scrollToCard(c.id);
}

/** 카드로 부드러운 스크롤 */
function scrollToCard(cardId) {
  setTimeout(() => {
    const el = document.querySelector(`.card[data-id="${cardId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
}
