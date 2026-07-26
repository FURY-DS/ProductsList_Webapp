/* =====================================================
   actions.js - 상단 액션 버튼 (내보내기 / 가져오기 / 전체삭제)
   ===================================================== */

/** 액션 버튼 초기화 (DOM 로드 후 호출) */
function initActions() {
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-import').addEventListener('click', importData);
  document.getElementById('import-input').addEventListener('change', handleImportFile);
  document.getElementById('btn-csv-template').addEventListener('click', downloadCsvTemplate);
  document.getElementById('btn-csv-import').addEventListener('click', importCsvData);
  document.getElementById('csv-import-input').addEventListener('change', handleCsvImportFile);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
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
    a.download = `상품리스트_${new Date().toISOString().slice(0, 10)}.json`;
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

      // 교체 확인 모달
      showModal({
        title: CONFIG.MESSAGES.IMPORT_TITLE,
        text: CONFIG.MESSAGES.IMPORT_TEXT(state.cards.length),
        onConfirm: () => {
          state.cards = data;
          save();
          render();
          showToast(CONFIG.MESSAGES.IMPORT_DONE(data.length));
        }
      });

      // 취소 시 추가 모드로 전환 (한 번만)
      const cancelBtn = document.getElementById('modal-cancel');
      const onceHandler = () => {
        cancelBtn.removeEventListener('click', onceHandler);
        state.cards = state.cards.concat(data);
        save();
        render();
        showToast(CONFIG.MESSAGES.IMPORT_ADDED(data.length));
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
    ['가방', '블랙', '15', '215', '0.16', 'https://example.com/1', 'https://example.com/2', 'R001', 'N001', 'P001', 'NY001'],
    ['신발', '화이트 270', '30', '215', '0.18', '', '', 'R002', 'N002', 'P002', 'NY002']
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
  a.download = '상품리스트_템플릿.csv';
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
          save();
          render();
          showToast(CONFIG.MESSAGES.CSV_IMPORT_DONE(cards.length));
        }
      });

      // 취소 시 추가 모드
      const cancelBtn = document.getElementById('modal-cancel');
      const onceHandler = () => {
        cancelBtn.removeEventListener('click', onceHandler);
        state.cards = state.cards.concat(cards);
        save();
        render();
        showToast(CONFIG.MESSAGES.CSV_IMPORT_ADDED(cards.length));
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
      save();
      render();
      showToast(CONFIG.MESSAGES.ALL_DELETED);
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
      save();
      render();
      showToast(CONFIG.MESSAGES.DELETED);
    }
  });
}

/** 새 카드 추가 (보드 끝) */
function addCard() {
  const c = newCard();
  state.cards.push(c);
  save();
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
  save();
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
