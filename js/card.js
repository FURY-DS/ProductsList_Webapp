/* =====================================================
   card.js - 카드 렌더링 및 보드 관리
   ===================================================== */

let boardEl = null;

/**
 * 체크된 카드 ID 추적 (메모리 내에서만 유지)
 * - render() 재호출(검색, 숨기기, 펼치기, 편집 등) 시에도 체크 상태 보존
 * - 페이지 이동(메뉴 클릭으로 다른 HTML 로드) 시 자동 초기화
 */
const checkedCardIds = new Set();

/** 보드 요소 초기화 (DOM 로드 후 호출) */
function initBoard() {
  boardEl = document.getElementById('board');
  // CSS 변수로 컬럼 수 전달
  document.documentElement.style.setProperty('--columns', CONFIG.COLUMNS);
}

/**
 * 총합 계산: 원가 x 환율 x 퍼센트
 * @param {Object} card
 * @returns {number}
 */
function computeTotal(card) {
  const cost = parseNum(card.cost);
  const rate = parseNum(card.rate);
  const pct  = parseNum(card.percent);
  return round2(cost * rate * pct);
}

/** 모든 카드 한 번에 접기/펼치기 */
function toggleAllCards(collapse) {
  if (state.cards.length === 0) return;
  state.cards.forEach(c => c.isCollapsed = collapse);
  const result = save();
  render();
  reportSaveResult(result, CONFIG.MESSAGES,
    collapse ? CONFIG.MESSAGES.ALL_COLLAPSED : CONFIG.MESSAGES.ALL_EXPANDED);
}
function render() {
  boardEl.innerHTML = '';
  updateSearchCount();
  updateToggleAllButton();

  // 빈 상태
  if (state.cards.length === 0) {
    renderEmptyState(CONFIG.MESSAGES.EMPTY_TITLE, CONFIG.MESSAGES.EMPTY_DESC, true);
    return;
  }

  // 검색 필터링
  const q = searchQuery.trim();
  const filtered = state.cards
    .map((card, originalIdx) => ({ card, originalIdx }))
    .filter(({ card }) => matchesQuery(card, q));

  if (filtered.length === 0) {
    renderEmptyState(CONFIG.MESSAGES.NO_RESULT_TITLE, CONFIG.MESSAGES.NO_RESULT_DESC(escapeAttr(q)), false);
    return;
  }

  // 컬럼 수만큼 div 생성 후 균등 분배
  const cols = [];
  for (let i = 0; i < CONFIG.COLUMNS; i++) {
    cols.push(document.createElement('div'));
  }
  filtered.forEach((entry, idx) => {
    cols[idx % CONFIG.COLUMNS].appendChild(renderCard(entry.card, entry.originalIdx));
  });
  cols.forEach(c => boardEl.appendChild(c));
}

/** 빈 상태 렌더링 (상품 없음 / 검색 결과 없음) */
function renderEmptyState(title, desc, showAddBtn) {
  const empty = document.createElement('div');
  empty.className = 'empty';
  empty.style.gridColumn = '1 / -1';
  let html = `<h2>${title}</h2><p>${desc}</p>`;
  if (showAddBtn) {
    html += `<button class="btn btn-add" id="empty-add">${CONFIG.MESSAGES.EMPTY_ADD_BTN}</button>`;
  }
  empty.innerHTML = html;
  boardEl.appendChild(empty);
  if (showAddBtn) {
    document.getElementById('empty-add').addEventListener('click', addCard);
  }
}

/**
 * 개별 카드 렌더링
 * @param {Object} card - 카드 데이터
 * @param {number} idx - 원래 인덱스 (표시용)
 * @returns {HTMLElement}
 */
function renderCard(card, idx) {
  const wrap = document.createElement('div');
  wrap.className = 'card'
    + (card.isEditing ? '' : ' saved')
    + (card.isCollapsed ? ' collapsed' : '');
  wrap.dataset.id = card.id;

  // ----- Header -----
  const header = document.createElement('div');
  header.className = 'card-header';
  const actionBtn = card.isEditing
    ? `<button class="btn btn-add" data-action="save" title="입력한 내용 저장">${CONFIG.MESSAGES.BTN_SAVE}</button>`
    : `<button class="btn btn-cancel" data-action="edit" title="다시 수정하기">${CONFIG.MESSAGES.BTN_EDIT}</button>`;

  const toggleBtn = card.isCollapsed
    ? `<button class="btn btn-toggle" data-action="expand" title="상세 정보 펼치기">${CONFIG.MESSAGES.BTN_EXPAND}</button>`
    : `<button class="btn btn-toggle" data-action="collapse" title="상세 정보 숨기기">${CONFIG.MESSAGES.BTN_COLLAPSE}</button>`;

  const badgeKey = CONFIG.CARD_HEADER_BADGE_FIELD;
  const badgeVal = badgeKey && card[badgeKey] ? escapeAttr(String(card[badgeKey])) : '';
  const badgeHtml = badgeVal
    ? `<span class="card-badge" title="${escapeAttr(CONFIG.FIELDS[badgeKey].label)}">${badgeVal}</span>`
    : '';

  const originKey = CONFIG.CARD_HEADER_ORIGIN_FIELD;
  const originHtml = originKey
    ? `<input type="text" class="card-origin-input" name="${originKey}"
        list="origin-suggestions" value="${escapeAttr(card[originKey] || '')}"
        placeholder="${escapeAttr(CONFIG.FIELDS[originKey].placeholder)}"
        title="${escapeAttr(CONFIG.FIELDS[originKey].label)}"
        ${card.isEditing ? '' : 'readonly'} />`
    : '';

  const statusKey = CONFIG.CARD_HEADER_STATUS_FIELD;
  const statusVal = statusKey && card[statusKey] ? String(card[statusKey]) : '';
  const statusOptions = CONFIG.STATUS_OPTIONS || [];
  const statusPlaceholder = statusKey ? CONFIG.FIELDS[statusKey].placeholder : '';
  const statusDisplay = statusVal || statusPlaceholder;
  const statusHtml = statusKey
    ? `<div class="card-status-dd" data-card-id="${card.id}">
        <button type="button" class="card-status-btn" title="${escapeAttr(CONFIG.FIELDS[statusKey].label)}">
          <span class="card-status-text">${escapeAttr(statusDisplay)}</span>
          <span class="card-status-arrow">▾</span>
        </button>
        <ul class="card-status-menu">
          <li class="card-status-opt ${statusVal === '' ? 'active' : ''}" data-value="">${escapeAttr(statusPlaceholder)}</li>
          ${statusOptions.map(opt => `<li class="card-status-opt ${opt === statusVal ? 'active' : ''}" data-value="${escapeAttr(opt)}">${escapeAttr(opt)}</li>`).join('')}
        </ul>
      </div>`
    : '';

  header.innerHTML = `
    <div class="card-index-wrap">
      <input type="checkbox" class="card-select" data-card-id="${card.id}" title="이 카드 선택" />
      <span class="card-index">#${String(idx + 1).padStart(2, '0')}</span>
      ${originHtml}
      ${statusHtml}
      ${badgeHtml}
    </div>
    <div class="card-tools">${toggleBtn}${actionBtn}</div>
  `;
  wrap.appendChild(header);

  // ----- 판매자상품코드 자동 표시줄 (헤더 바로 아래, 카드 외부 가시 영역) -----
  const nyKey = 'ny';
  const nyVal = card[nyKey] ? escapeAttr(String(card[nyKey])) : '';
  const nyBar = document.createElement('div');
  nyBar.className = 'card-ny-bar';
  nyBar.dataset.field = nyKey;
  nyBar.innerHTML = `
    <span class="card-ny-label">${escapeAttr(CONFIG.FIELDS[nyKey].label || '판매자상품코드')}</span>
    <span class="card-ny-value ${nyVal ? '' : 'is-empty'}">${nyVal || '—'}</span>
  `;
  wrap.appendChild(nyBar);

  // ----- 본문: CONFIG.CARD_LAYOUT 기반 렌더링 -----
  // 접힌 상태면 사진 + 상품명/옵션명만 표시
  if (card.isCollapsed) {
    const photoSection = CONFIG.CARD_LAYOUT.find(s => s.type === 'photo+fields');
    if (photoSection) {
      wrap.appendChild(renderPhotoRow(card, photoSection.fields));
    }
  } else {
    CONFIG.CARD_LAYOUT.forEach(section => {
      if (section.type === 'photo+fields') {
        wrap.appendChild(renderPhotoRow(card, section.fields));
      } else if (section.type === 'row') {
        wrap.appendChild(renderFieldRow(card, section));
      }
    });

    // ----- Footer (+ / -) -----
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    footer.innerHTML = `
      <button class="btn btn-add" data-action="add">${CONFIG.MESSAGES.BTN_ADD}</button>
      <button class="btn btn-remove" data-action="delete">${CONFIG.MESSAGES.BTN_DELETE}</button>
    `;
    wrap.appendChild(footer);
  }

  // ----- 이벤트 바인딩 -----
  bindCardEvents(wrap, card);

  // ----- 체크박스 상태 복원 + 이벤트 -----
  const checkbox = wrap.querySelector('.card-select');
  if (checkbox) {
    checkbox.checked = checkedCardIds.has(card.id);
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        checkedCardIds.add(card.id);
      } else {
        checkedCardIds.delete(card.id);
      }
    });
  }

  return wrap;
}

/** 사진 + 필드 나란히 배치하는 row */
function renderPhotoRow(card, fieldNames) {
  const row = document.createElement('div');
  row.className = 'card-row';

  // 사진 박스
  const photoBox = document.createElement('div');
  photoBox.className = 'photo-box' + (card.image ? ' has-image' : '');
  photoBox.innerHTML = card.image
    ? `<img src="${escapeAttr(card.image)}" alt="상품 이미지" />`
    : `<span>사진</span>`;

  // 편집 중일 때만 사진 액션 버튼 표시
  if (card.image && card.isEditing) {
    const actions = document.createElement('div');
    actions.className = 'photo-actions';
    actions.innerHTML = `
      <button data-act="replace" title="사진 변경">수정</button>
      <button data-act="remove" class="danger" title="사진 삭제">삭제</button>
    `;
    photoBox.appendChild(actions);
  }

  if (card.isEditing) {
    photoBox.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      triggerPhotoUpload(card.id);
    });
  }

  // 사진 액션 버튼 이벤트
  photoBox.querySelectorAll('button[data-act]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const act = btn.dataset.act;
      if (act === 'replace') triggerPhotoUpload(card.id);
      else if (act === 'remove') removePhoto(card.id);
    });
  });

  row.appendChild(photoBox);

  // 필드들
  const fields = document.createElement('div');
  fields.className = 'fields';
  fieldNames.forEach(name => {
    fields.appendChild(makeField(name, card[name], !card.isEditing));
  });
  row.appendChild(fields);

  return row;
}

/** field-row (원가/환율/퍼센트, 링크, 코드 4종 등) */
function renderFieldRow(card, section) {
  const row = document.createElement('div');
  row.className = 'field-row ' + (section.className || '');

  section.fields.forEach(name => {
    row.appendChild(makeField(name, card[name], !card.isEditing));
  });

  // 총합 필드 추가
  if (section.total) {
    const total = computeTotal(card);
    const totalField = document.createElement('div');
    totalField.className = 'field';
    totalField.innerHTML = `
      <label>총합 (${CONFIG.CURRENCY.TOTAL})</label>
      <input type="text" class="highlight" readonly value="${formatNumber(total)}" placeholder="자동 계산" />
    `;
    row.appendChild(totalField);
  }

  return row;
}

/**
 * 단일 입력 필드 생성
 * @param {string} name - 필드 키 (CONFIG.FIELDS 기준)
 * @param {string} value - 현재 값
 * @param {boolean} readonly - 읽기 전용 여부
 * @returns {HTMLElement}
 */
function makeField(name, value, readonly) {
  const def = CONFIG.FIELDS[name];
  if (!def) return document.createElement('div');

  const f = document.createElement('div');
  f.className = 'field';
  const safeVal = value == null ? '' : value;
  const roAttr = readonly ? 'readonly' : '';
  const extra = def.extra || '';
  const label = def.label.includes('(')
    ? def.label
    : (needsCurrency(name) ? `${def.label} (${getCurrencySymbol(name)})` : def.label);

  // 읽기 전용 숫자 필드는 콤마 + 소수점 2자리 포맷 적용
  const isReadonlyNumber = readonly && def.type === 'number';
  const inputType = isReadonlyNumber ? 'text' : def.type;
  const displayVal = isReadonlyNumber
    ? formatNumber(parseNum(safeVal))
    : escapeAttr(String(safeVal));

  f.innerHTML = `
    <label>${label}</label>
    <input type="${inputType}" name="${name}" value="${displayVal}" placeholder="${escapeAttr(def.placeholder)}" ${extra} ${roAttr} />
  `;
  return f;
}

/** 해당 필드에 통화 기호가 필요한지 */
function needsCurrency(name) {
  return name === 'rate';
}

/** 필드에 맞는 통화 기호 반환 */
function getCurrencySymbol(name) {
  if (name === 'cost') return CONFIG.CURRENCY.COST;
  if (name === 'rate') return CONFIG.CURRENCY.RATE;
  return '';
}

/** 카드 내 이벤트 바인딩 */
function bindCardEvents(wrap, card) {
  // 입력 변경
  wrap.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.name || !card.isEditing) return;
    const c = findCard(card.id);
    if (!c) return;
    c[t.name] = t.value;
    // 입력 중에는 성공 토스트를 띄우지 않되, 저장 실패는 즉시 알림
    reportSaveResult(save(), CONFIG.MESSAGES);

    // 총합 자동 갱신
    if (CONFIG.TOTAL_FIELDS.includes(t.name)) {
      const totalEl = wrap.querySelector('.field-row.three .field:last-child input');
      if (totalEl) totalEl.value = formatNumber(computeTotal(c));
    }

    // 판매자상품코드 실시간 표시줄 갱신
    if (t.name === 'ny') {
      const nyBar = wrap.querySelector('.card-ny-bar');
      if (nyBar) {
        const valEl = nyBar.querySelector('.card-ny-value');
        if (valEl) {
          valEl.textContent = t.value || '—';
          valEl.classList.toggle('is-empty', !t.value);
        }
      }
    }

    // 헤더 배지 실시간 갱신
    const badgeKey = CONFIG.CARD_HEADER_BADGE_FIELD;
    if (badgeKey && t.name === badgeKey) {
      let badgeEl = wrap.querySelector('.card-badge');
      if (!badgeEl && t.value) {
        const wrapEl = wrap.querySelector('.card-index-wrap');
        if (wrapEl) {
          badgeEl = document.createElement('span');
          badgeEl.className = 'card-badge';
          badgeEl.title = escapeAttr(CONFIG.FIELDS[badgeKey].label);
          wrapEl.appendChild(badgeEl);
        }
      }
      if (badgeEl) {
        if (t.value) {
          badgeEl.textContent = t.value;
          badgeEl.style.display = '';
        } else {
          badgeEl.style.display = 'none';
        }
      }
    }
  });

  // 진행 상태 커스텀 드랍다운 바인딩
  const statusDd = wrap.querySelector('.card-status-dd');
  if (statusDd) bindStatusDropdown(statusDd, card);

  // 버튼 클릭
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'add') {
      addCardAfter(card.id);
    } else if (action === 'delete') {
      confirmDelete(card.id);
    } else if (action === 'save') {
      saveCard(card.id);
    } else if (action === 'edit') {
      editCard(card.id);
    } else if (action === 'collapse' || action === 'expand') {
      toggleCollapse(card.id);
    }
  });
}

/** 진행상태 커스텀 드랍다운 바인딩 (네이티브 select는 OS 렌더링이라 가운데 정렬 불가) */
let statusDdOutsideBound = false;
function bindStatusDropdown(dd, card) {
  const btn = dd.querySelector('.card-status-btn');
  const menu = dd.querySelector('.card-status-menu');
  if (!btn || !menu) return;

  // 다른 카드 드랍다운이 열려있으면 닫기 (외부 클릭 시 닫기는 전역 핸들러로 처리)
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.card-status-menu.open').forEach(m => {
      if (m !== menu) m.classList.remove('open');
    });
    menu.classList.toggle('open');
  });

  menu.querySelectorAll('.card-status-opt').forEach(li => {
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      const newVal = li.dataset.value;
      const c = findCard(card.id);
      if (!c) return;
      c[CONFIG.CARD_HEADER_STATUS_FIELD] = newVal;
      reportSaveResult(save(), CONFIG.MESSAGES);
      render();
    });
  });

  // 외부 클릭 시 모든 드랍다운 닫기 (페이지 로드 시 1회만 등록)
  if (!statusDdOutsideBound) {
    statusDdOutsideBound = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.card-status-menu.open').forEach(m => m.classList.remove('open'));
    });
  }
}

/** 카드 저장 (편집 잠금) */
function saveCard(cardId) {
  const c = findCard(cardId);
  if (!c) return;
  c.isEditing = false;
  const result = save();
  render();
  reportSaveResult(result, CONFIG.MESSAGES, CONFIG.MESSAGES.SAVED);
}

/** 카드 수정 모드 진입 */
function editCard(cardId) {
  const c = findCard(cardId);
  if (!c) return;
  c.isEditing = true;
  c.isCollapsed = false; // 수정 시 자동 펼침
  reportSaveResult(save(), CONFIG.MESSAGES);
  render();
  setTimeout(() => {
    const el = document.querySelector(`.card[data-id="${cardId}"] input`);
    if (el) el.focus();
  }, 50);
}

/** 카드 접기/펼치기 토글 */
function toggleCollapse(cardId) {
  const c = findCard(cardId);
  if (!c) return;
  c.isCollapsed = !c.isCollapsed;
  reportSaveResult(save(), CONFIG.MESSAGES);
  render();
}
