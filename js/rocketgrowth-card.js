/* =====================================================
   rocketgrowth-card.js - 로켓그로스 카드 렌더링 및 보드 관리
   ===================================================== */

let rocketgrowthBoardEl = null;

/** 보드 요소 초기화 */
function initRocketgrowthBoard() {
  rocketgrowthBoardEl = document.getElementById('board');
  document.documentElement.style.setProperty('--columns', ROCKETGROWTH_CONFIG.COLUMNS);
}

/** 상품리스트에서 판매자상품코드로 상품 찾기 (대소문자 구분 없이 정확 일치) */
function lookupProductlistByCodeForRocketgrowth(code) {
  return lookupProductlistByCodeFromForRocketgrowth(code, loadProductlistDataForRocketgrowth());
}

/** 상품리스트에서 코드에 해당하는 상품 이미지 가져오기 */
function getProductlistImageForRocketgrowth(code) {
  const product = lookupProductlistByCodeForRocketgrowth(code);
  return product && product.image ? product.image : '';
}

/** 로켓그로스 카드용 이미지 결정 (직접 업로드한 사진 우선, 없으면 상품리스트 조회) */
function getRocketgrowthImage(card) {
  if (card.image) return card.image;
  return getProductlistImageForRocketgrowth(card.sellerCode);
}

/** 복수품 항목용 이미지 결정 (직접 업로드한 사진 우선, 없으면 상품리스트 조회) */
function getRocketgrowthBundleItemImage(item) {
  if (item.image) return item.image;
  return getProductlistImageForRocketgrowth(item.sellerCode);
}

/** 상품리스트 상품의 총합 계산 */
function computeProductlistTotalForRocketgrowth(product) {
  const cost = parseNum(product.cost);
  const rate = parseNum(product.rate);
  const pct  = parseNum(product.percent);
  return cost * rate * pct;
}

/** 최종원가 계산 */
function computeRocketgrowthFinalCost(card) {
  if (card.isBundle) {
    return card.bundleItems.reduce((sum, item) => sum + parseNum(item.total), 0);
  }
  return parseNum(card.finalCost);
}

/** 판매수수료 최종결과값 계산 */
function computeRocketgrowthFeeAmount(card) {
  return parseNum(card.sellingPrice) * parseNum(card.feeRate);
}

/** 최종이익 계산: 판매가 - 최종원가 - 판매수수료 - 피킹라벨출고비 - 쿠팡입출고비용 */
function computeRocketgrowthFinalProfit(card) {
  return parseNum(card.sellingPrice)
    - parseNum(card.finalCost)
    - parseNum(card.feeAmount)
    - parseNum(card.warehouseFee)
    - parseNum(card.marketFee);
}

/** 카드의 계산 필드를 최신값으로 갱신 */
function recalcRocketgrowthCard(card) {
  if (card.isBundle) {
    card.finalCost = computeRocketgrowthFinalCost(card);
  }
  card.feeAmount = computeRocketgrowthFeeAmount(card);
  card.finalProfit = computeRocketgrowthFinalProfit(card);
}

/** 모든 카드 한 번에 접기/펼치기 */
function toggleAllRocketgrowthCards(collapse) {
  if (rocketgrowthState.cards.length === 0) return;
  rocketgrowthState.cards.forEach(c => c.isCollapsed = collapse);
  const result = saveRocketgrowth();
  renderRocketgrowth();
  reportSaveResult(result, ROCKETGROWTH_CONFIG.MESSAGES, collapse ? ROCKETGROWTH_CONFIG.MESSAGES.ALL_COLLAPSED : ROCKETGROWTH_CONFIG.MESSAGES.ALL_EXPANDED);
}

/** 전체 렌더링 */
function renderRocketgrowth() {
  rocketgrowthBoardEl.innerHTML = '';
  updateRocketgrowthSearchCount();
  updateRocketgrowthToggleAllButton();

  if (rocketgrowthState.cards.length === 0) {
    renderRocketgrowthEmptyState(ROCKETGROWTH_CONFIG.MESSAGES.EMPTY_TITLE, ROCKETGROWTH_CONFIG.MESSAGES.EMPTY_DESC, true);
    return;
  }

  const q = rocketgrowthSearchQuery.trim();
  const filtered = rocketgrowthState.cards
    .map((card, originalIdx) => ({ card, originalIdx }))
    .filter(({ card }) => matchesRocketgrowthQuery(card, q));

  if (filtered.length === 0) {
    renderRocketgrowthEmptyState(ROCKETGROWTH_CONFIG.MESSAGES.NO_RESULT_TITLE, ROCKETGROWTH_CONFIG.MESSAGES.NO_RESULT_DESC(escapeAttr(q)), false);
    return;
  }

  const cols = [];
  for (let i = 0; i < ROCKETGROWTH_CONFIG.COLUMNS; i++) {
    cols.push(document.createElement('div'));
  }
  filtered.forEach((entry, idx) => {
    cols[idx % ROCKETGROWTH_CONFIG.COLUMNS].appendChild(renderRocketgrowthCard(entry.card, entry.originalIdx));
  });
  cols.forEach(c => rocketgrowthBoardEl.appendChild(c));
}

/** 빈 상태 렌더링 */
function renderRocketgrowthEmptyState(title, desc, showAddBtn) {
  const empty = document.createElement('div');
  empty.className = 'empty';
  empty.style.gridColumn = '1 / -1';
  let html = `<h2>${title}</h2><p>${desc}</p>`;
  if (showAddBtn) {
    html += `<button class="btn btn-add" id="empty-add">${ROCKETGROWTH_CONFIG.MESSAGES.EMPTY_ADD_BTN}</button>`;
  }
  empty.innerHTML = html;
  rocketgrowthBoardEl.appendChild(empty);
  if (showAddBtn) {
    document.getElementById('empty-add').addEventListener('click', addRocketgrowthCard);
  }
}

/** 개별 카드 렌더링 */
function renderRocketgrowthCard(card, idx) {
  const wrap = document.createElement('div');
  wrap.className = 'card smartstore-card'
    + (card.isEditing ? '' : ' saved')
    + (card.isCollapsed ? ' collapsed' : '');
  wrap.dataset.id = card.id;

  // ----- Header -----
  const header = document.createElement('div');
  header.className = 'card-header';
  const actionBtn = card.isEditing
    ? `<button class="btn btn-add" data-action="save" title="입력한 내용 저장">${ROCKETGROWTH_CONFIG.MESSAGES.BTN_SAVE}</button>`
    : `<button class="btn btn-cancel" data-action="edit" title="다시 수정하기">${ROCKETGROWTH_CONFIG.MESSAGES.BTN_EDIT}</button>`;

  const toggleBtn = card.isCollapsed
    ? `<button class="btn btn-toggle" data-action="expand" title="상세 정보 펼치기">${ROCKETGROWTH_CONFIG.MESSAGES.BTN_EXPAND}</button>`
    : `<button class="btn btn-toggle" data-action="collapse" title="상세 정보 숨기기">${ROCKETGROWTH_CONFIG.MESSAGES.BTN_COLLAPSE}</button>`;

  const sellerCodeHtml = !card.isBundle && card.isEditing
    ? `<div class="field seller-code-field"><label>${ROCKETGROWTH_CONFIG.FIELDS.sellerCode.label}</label><input type="text" name="sellerCode" value="${escapeAttr(card.sellerCode)}" placeholder="${escapeAttr(ROCKETGROWTH_CONFIG.FIELDS.sellerCode.placeholder)}" /></div>`
    : (!card.isBundle && !card.isEditing
        ? `<span class="card-badge" title="${escapeAttr(ROCKETGROWTH_CONFIG.FIELDS.sellerCode.label)}">${escapeAttr(card.sellerCode || '')}</span>`
        : `<span class="card-badge bundle-badge">${escapeAttr(ROCKETGROWTH_CONFIG.MESSAGES.BUNDLE)}</span>`);

  header.innerHTML = `
    <div class="card-index-wrap">
      <span class="card-index">#${String(idx + 1).padStart(2, '0')}</span>
      ${sellerCodeHtml}
    </div>
    <div class="card-tools">${toggleBtn}${actionBtn}</div>
  `;
  wrap.appendChild(header);

  // ----- 본문 -----
  if (card.isCollapsed) {
    wrap.appendChild(renderRocketgrowthPhotoRow(card));
  } else {
    wrap.appendChild(renderRocketgrowthPhotoRow(card));
    wrap.appendChild(renderRocketgrowthCalcRows(card));
    if (card.isBundle) {
      wrap.appendChild(renderRocketgrowthBundleSection(card));
    }

    // 복수품 전환 버튼 (단품 모드 편집 중)
    if (!card.isBundle && card.isEditing) {
      const bundleAdd = document.createElement('div');
      bundleAdd.className = 'bundle-add';
      bundleAdd.innerHTML = `<button class="btn btn-toggle" data-action="add-bundle-mode">${ROCKETGROWTH_CONFIG.MESSAGES.BTN_ADD_BUNDLE}</button>`;
      wrap.appendChild(bundleAdd);
    }

    // ----- Footer -----
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    footer.innerHTML = `
      <button class="btn btn-add" data-action="add">${ROCKETGROWTH_CONFIG.MESSAGES.BTN_ADD}</button>
      <button class="btn btn-remove" data-action="delete">${ROCKETGROWTH_CONFIG.MESSAGES.BTN_DELETE}</button>
    `;
    wrap.appendChild(footer);
  }

  bindRocketgrowthCardEvents(wrap, card);
  return wrap;
}

/** 사진 + 상품명/옵션명 row */
function renderRocketgrowthPhotoRow(card) {
  const row = document.createElement('div');
  row.className = 'card-row';

  const imgSrc = getRocketgrowthImage(card);
  const photoBox = document.createElement('div');
  photoBox.className = 'photo-box' + (imgSrc ? ' has-image' : '');
  photoBox.dataset.upload = 'card';
  photoBox.title = '사진 클릭하여 변경';
  photoBox.innerHTML = imgSrc
    ? `<img src="${escapeAttr(imgSrc)}" alt="상품 이미지" />`
    : `<span>사진</span>`;

  row.appendChild(photoBox);

  const fields = document.createElement('div');
  fields.className = 'fields';
  fields.appendChild(makeRocketgrowthField('name', card.name, !card.isEditing));
  fields.appendChild(makeRocketgrowthField('option', card.option, !card.isEditing));
  row.appendChild(fields);

  return row;
}

/** 계산 필드 rows */
function renderRocketgrowthCalcRows(card) {
  const container = document.createElement('div');
  container.className = 'smartstore-calc-rows';

  // 1행: 최종원가 | 판매가 | 판매수수료
  const row1 = document.createElement('div');
  row1.className = 'field-row three';
  row1.appendChild(makeRocketgrowthField('finalCost', card.finalCost, true));
  row1.appendChild(makeRocketgrowthField('sellingPrice', card.sellingPrice, !card.isEditing));
  row1.appendChild(makeRocketgrowthFeeField(card));
  container.appendChild(row1);

  // 2행: 피킹라벨출고비 | 쿠팡입출고비용 | 최종이익
  const row2 = document.createElement('div');
  row2.className = 'field-row three';
  row2.appendChild(makeRocketgrowthField('warehouseFee', card.warehouseFee, !card.isEditing));
  row2.appendChild(makeRocketgrowthField('marketFee', card.marketFee, !card.isEditing));
  row2.appendChild(makeRocketgrowthField('finalProfit', card.finalProfit, true));
  container.appendChild(row2);

  return container;
}

/** 판매수수료 필드 (라벨 옆에 비율 입력, 아래에 금액 표시) */
function makeRocketgrowthFeeField(card) {
  const f = document.createElement('div');
  f.className = 'field fee-field';
  const def = ROCKETGROWTH_CONFIG.FIELDS.feeRate;
  const roAttr = !card.isEditing ? 'readonly' : '';
  f.innerHTML = `
    <label>
      ${def.label}
      <input type="${def.type}" name="feeRate" class="fee-rate" value="${escapeAttr(card.feeRate)}" placeholder="${escapeAttr(def.placeholder)}" ${def.extra || ''} ${roAttr} />
    </label>
    <input type="text" name="feeAmount" class="highlight" readonly value="${escapeAttr(formatNumber(parseNum(card.feeAmount)))}" placeholder="${escapeAttr(ROCKETGROWTH_CONFIG.FIELDS.feeAmount.placeholder)}" />
  `;
  return f;
}

/** 단일 입력 필드 생성 */
function makeRocketgrowthField(name, value, readonly) {
  const def = ROCKETGROWTH_CONFIG.FIELDS[name];
  if (!def) return document.createElement('div');

  const f = document.createElement('div');
  f.className = 'field' + (name === 'feeAmount' || name === 'finalProfit' || name === 'finalCost' ? ' auto-field' : '');
  const safeVal = value == null ? '' : value;
  const roAttr = readonly || def.readonly ? 'readonly' : '';
  const extra = def.extra || '';
  const highlightClass = def.highlight ? 'highlight' : '';

  f.innerHTML = `
    <label>${def.label}</label>
    <input type="${def.type}" name="${name}" value="${escapeAttr(String(safeVal))}" placeholder="${escapeAttr(def.placeholder)}" ${extra} class="${highlightClass}" ${roAttr} />
  `;
  return f;
}

/** 복수품 항목 섹션 렌더링 */
function renderRocketgrowthBundleSection(card) {
  const section = document.createElement('div');
  section.className = 'bundle-section';

  const title = document.createElement('div');
  title.className = 'bundle-title';
  title.textContent = ROCKETGROWTH_CONFIG.MESSAGES.BUNDLE;
  section.appendChild(title);

  const list = document.createElement('div');
  list.className = 'bundle-list';
  card.bundleItems.forEach((item, idx) => {
    list.appendChild(renderRocketgrowthBundleItem(card, item, idx));
  });
  section.appendChild(list);

  // 편집 중일 때만 항목 추가 버튼
  if (card.isEditing) {
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-add bundle-add-item';
    addBtn.dataset.action = 'add-bundle-item';
    addBtn.textContent = ROCKETGROWTH_CONFIG.MESSAGES.BTN_ADD_ITEM + ' ' + ROCKETGROWTH_CONFIG.MESSAGES.BUNDLE;
    section.appendChild(addBtn);
  }

  return section;
}

/** 복수품 항목 row 렌더링 */
function renderRocketgrowthBundleItem(card, item, idx) {
  const row = document.createElement('div');
  row.className = 'bundle-item';
  row.dataset.itemId = item.id;

  const thumbSrc = getRocketgrowthBundleItemImage(item);
  const thumb = document.createElement('div');
  thumb.className = 'bundle-thumb' + (thumbSrc ? ' has-image' : '');
  thumb.dataset.upload = 'bundle';
  thumb.title = '사진 클릭하여 변경';
  thumb.innerHTML = thumbSrc
    ? `<img src="${escapeAttr(thumbSrc)}" alt="" />`
    : `<span>${idx + 1}</span>`;
  row.appendChild(thumb);

  const fieldsWrap = document.createElement('div');
  fieldsWrap.className = 'bundle-item-fields';

  const codeField = document.createElement('div');
  codeField.className = 'field bundle-code-field';
  const roAttr = card.isEditing ? '' : 'readonly';
  codeField.innerHTML = `
    <label>${ROCKETGROWTH_CONFIG.FIELDS.sellerCode.label}</label>
    <input type="text" name="itemSellerCode" value="${escapeAttr(item.sellerCode)}" placeholder="${escapeAttr(ROCKETGROWTH_CONFIG.FIELDS.sellerCode.placeholder)}" ${roAttr} />
  `;
  fieldsWrap.appendChild(codeField);

  const totalField = document.createElement('div');
  totalField.className = 'field bundle-total-field';
  totalField.innerHTML = `
    <label>${ROCKETGROWTH_CONFIG.FIELDS.itemTotal.label}</label>
    <input type="text" name="itemTotal" class="highlight" readonly value="${escapeAttr(formatNumber(parseNum(item.total)))}" placeholder="${escapeAttr(ROCKETGROWTH_CONFIG.FIELDS.itemTotal.placeholder)}" />
  `;
  fieldsWrap.appendChild(totalField);

  row.appendChild(fieldsWrap);

  if (card.isEditing) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-remove bundle-remove';
    removeBtn.dataset.action = 'remove-bundle-item';
    removeBtn.title = '이 항목 삭제';
    removeBtn.textContent = ROCKETGROWTH_CONFIG.MESSAGES.BTN_REMOVE_ITEM;
    row.appendChild(removeBtn);
  }

  return row;
}

/** 카드 내 이벤트 바인딩 */
function bindRocketgrowthCardEvents(wrap, card) {
  // 입력 변경 (실시간 계산용)
  wrap.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.name) return;
    const c = findRocketgrowthCard(card.id);
    if (!c) return;

    // 판매자상품코드는 change(Enter/Blur) 시 조회
    if (t.name === 'sellerCode' || t.name === 'itemSellerCode') return;

    if (c.isEditing) {
      c[t.name] = t.value;
      recalcRocketgrowthCard(c);
      reportSaveResult(saveRocketgrowth(), ROCKETGROWTH_CONFIG.MESSAGES);
      updateRocketgrowthCalcDisplay(wrap, c);
    }
  });

  // 판매자상품코드 조회는 change 이벤트에서 처리 (입력 중 포커스 유지)
  wrap.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.name) return;
    const c = findRocketgrowthCard(card.id);
    if (!c) return;

    if (t.name === 'sellerCode') {
      c.sellerCode = t.value;
      updateRocketgrowthSingleProductFromCode(c, t.value);
      reportSaveResult(saveRocketgrowth(), ROCKETGROWTH_CONFIG.MESSAGES);
      renderRocketgrowth();
      return;
    }

    if (t.name === 'itemSellerCode') {
      const itemId = t.closest('.bundle-item')?.dataset.itemId;
      if (itemId) {
        updateRocketgrowthBundleItemFromCode(c, itemId, t.value);
        reportSaveResult(saveRocketgrowth(), ROCKETGROWTH_CONFIG.MESSAGES);
        renderRocketgrowth();
      }
    }
  });

  // 버튼 클릭
  wrap.addEventListener('click', (e) => {
    // 사진 박스 / 복수품 썸네일 클릭 → 사진 업로드
    const photoBox = e.target.closest('.photo-box');
    const bundleThumb = e.target.closest('.bundle-thumb');
    if (photoBox || bundleThumb) {
      const c = findRocketgrowthCard(card.id);
      if (!c) return;

      // 저장 상태면 수정 모드로 전환
      if (!c.isEditing) {
        c.isEditing = true;
        c.isCollapsed = false;
        reportSaveResult(saveRocketgrowth(), ROCKETGROWTH_CONFIG.MESSAGES);
        renderRocketgrowth();
      }

      if (photoBox) {
        triggerRocketgrowthPhotoUpload(c.id, 'card');
      } else {
        const itemId = bundleThumb.closest('.bundle-item')?.dataset.itemId;
        if (itemId) triggerRocketgrowthPhotoUpload(c.id, 'bundle', itemId);
      }
      return;
    }

    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'add') {
      addRocketgrowthCardAfter(card.id);
    } else if (action === 'delete') {
      confirmDeleteRocketgrowth(card.id);
    } else if (action === 'save') {
      saveRocketgrowthCard(card.id);
    } else if (action === 'edit') {
      editRocketgrowthCard(card.id);
    } else if (action === 'collapse' || action === 'expand') {
      toggleRocketgrowthCollapse(card.id);
    } else if (action === 'add-bundle-mode') {
      enableRocketgrowthBundleMode(card.id);
    } else if (action === 'add-bundle-item') {
      addRocketgrowthBundleItem(card.id);
    } else if (action === 'remove-bundle-item') {
      const itemId = btn.closest('.bundle-item')?.dataset.itemId;
      if (itemId) removeRocketgrowthBundleItem(card.id, itemId);
    }
  });
}

/** 화면에서 계산 필드만 갱신 (전체 렌더링 없이) */
function updateRocketgrowthCalcDisplay(wrap, card) {
  const finalCostEl = wrap.querySelector('input[name="finalCost"]');
  const feeAmountEl = wrap.querySelector('input[name="feeAmount"]');
  const finalProfitEl = wrap.querySelector('input[name="finalProfit"]');
  if (finalCostEl) finalCostEl.value = formatNumber(parseNum(card.finalCost));
  if (feeAmountEl) feeAmountEl.value = formatNumber(parseNum(card.feeAmount));
  if (finalProfitEl) finalProfitEl.value = formatNumber(parseNum(card.finalProfit));
}

/** 저장된 데이터에서 판매자상품코드 다시 조회 및 계산 */
function resolveRocketgrowthCards() {
  const products = loadProductlistDataForRocketgrowth();
  if (!products.length) return; // 상품리스트 데이터가 없으면 기존 데이터를 그대로 유지

  rocketgrowthState.cards.forEach(c => {
    if (c.isBundle) {
      c.bundleItems.forEach(item => {
        if (!item.sellerCode || !item.sellerCode.trim()) return;
        const product = lookupProductlistByCodeFromForRocketgrowth(item.sellerCode, products);
        if (!product) return; // 매칭 실패 시 기존 데이터 유지
        if (product.name) item.name = product.name;
        if (product.option) item.option = product.option;
        item.total = computeProductlistTotalForRocketgrowth(product);
      });
    } else if (c.sellerCode && c.sellerCode.trim()) {
      const product = lookupProductlistByCodeFromForRocketgrowth(c.sellerCode, products);
      if (!product) return; // 매칭 실패 시 기존 데이터 유지
      if (product.name) c.name = product.name;
      if (product.option) c.option = product.option;
      c.finalCost = computeProductlistTotalForRocketgrowth(product);
    }
    recalcRocketgrowthCard(c);
  });
}

/** 주어진 상품 목록에서 판매자상품코드로 상품 찾기 */
function lookupProductlistByCodeFromForRocketgrowth(code, products) {
  if (!code || !code.trim()) return null;
  const target = code.trim().toLowerCase();
  return products.find(p => String(p.ny || '').trim().toLowerCase() === target) || null;
}

/** 단품 모드: 판매자상품코드로 상품리스트에서 정보 불러오기 */
function updateRocketgrowthSingleProductFromCode(card, code) {
  card.sellerCode = code;
  if (!code || !code.trim()) return;
  const product = lookupProductlistByCodeForRocketgrowth(code);
  if (!product) {
    showToast(ROCKETGROWTH_CONFIG.MESSAGES.PRODUCT_NOT_FOUND(code));
    return;
  }
  // 이미지는 상품리스트에서 실시간 조회하므로 카드에 저장하지 않음
  card.name = product.name || '';
  card.option = product.option || '';
  card.finalCost = computeProductlistTotalForRocketgrowth(product);
  recalcRocketgrowthCard(card);
}

/** 복수품 항목: 판매자상품코드로 상품리스트에서 정보 불러오기 */
function updateRocketgrowthBundleItemFromCode(card, itemId, code) {
  const item = findRocketgrowthBundleItem(card.id, itemId);
  if (!item) return;
  item.sellerCode = code;
  if (!code || !code.trim()) return;
  const product = lookupProductlistByCodeForRocketgrowth(code);
  if (!product) {
    showToast(ROCKETGROWTH_CONFIG.MESSAGES.PRODUCT_NOT_FOUND(code));
    return;
  }
  // 이미지는 상품리스트에서 실시간 조회하므로 항목에 저장하지 않음
  item.name = product.name || '';
  item.option = product.option || '';
  item.total = computeProductlistTotalForRocketgrowth(product);
  recalcRocketgrowthCard(card);
}

/** 카드 저장 */
function saveRocketgrowthCard(cardId) {
  const c = findRocketgrowthCard(cardId);
  if (!c) return;
  syncRocketgrowthCardFromDOM(cardId);
  c.isEditing = false;
  const result = saveRocketgrowth();
  renderRocketgrowth();
  reportSaveResult(result, ROCKETGROWTH_CONFIG.MESSAGES, ROCKETGROWTH_CONFIG.MESSAGES.SAVED);
}

/** 렌더링된 DOM의 현재 입력값을 상태 객체에 동기화 (저장 직전 안전 장치) */
function syncRocketgrowthCardFromDOM(cardId) {
  const card = findRocketgrowthCard(cardId);
  if (!card) return;
  const wrap = document.querySelector(`.smartstore-card[data-id="${cardId}"]`);
  if (!wrap) return;

  const getVal = (name) => {
    const el = wrap.querySelector(`[name="${name}"]`);
    return el ? el.value : undefined;
  };

  if (!card.isBundle) {
    const sc = getVal('sellerCode');
    if (sc !== undefined) card.sellerCode = sc;
  }

  ['name', 'option', 'sellingPrice', 'feeRate', 'warehouseFee', 'marketFee'].forEach(k => {
    const v = getVal(k);
    if (v !== undefined) card[k] = v;
  });

  if (card.isBundle) {
    wrap.querySelectorAll('.bundle-item').forEach(row => {
      const itemId = row.dataset.itemId;
      const item = card.bundleItems.find(i => i.id === itemId);
      if (!item) return;
      const el = row.querySelector('input[name="itemSellerCode"]');
      if (el) item.sellerCode = el.value;
    });
  }
}

/** 카드 수정 모드 진입 */
function editRocketgrowthCard(cardId) {
  const c = findRocketgrowthCard(cardId);
  if (!c) return;
  c.isEditing = true;
  c.isCollapsed = false;
  reportSaveResult(saveRocketgrowth(), ROCKETGROWTH_CONFIG.MESSAGES);
  renderRocketgrowth();
  setTimeout(() => {
    const el = document.querySelector(`.smartstore-card[data-id="${cardId}"] input[name="sellerCode"], .smartstore-card[data-id="${cardId}"] input[name="itemSellerCode"]`);
    if (el) el.focus();
  }, 50);
}

/** 카드 접기/펼치기 */
function toggleRocketgrowthCollapse(cardId) {
  const c = findRocketgrowthCard(cardId);
  if (!c) return;
  c.isCollapsed = !c.isCollapsed;
  reportSaveResult(saveRocketgrowth(), ROCKETGROWTH_CONFIG.MESSAGES);
  renderRocketgrowth();
}

/** 단품 카드를 복수품 모드로 전환 */
function enableRocketgrowthBundleMode(cardId) {
  const c = findRocketgrowthCard(cardId);
  if (!c) return;
  c.isBundle = true;
  c.sellerCode = '';
  c.bundleItems = [newRocketgrowthBundleItem()];
  recalcRocketgrowthCard(c);
  reportSaveResult(saveRocketgrowth(), ROCKETGROWTH_CONFIG.MESSAGES);
  renderRocketgrowth();
}

/** 사진 업로드 트리거 (단품 / 복수품 항목) */
function triggerRocketgrowthPhotoUpload(cardId, type, itemId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > ROCKETGROWTH_CONFIG.IMAGE_MAX_SIZE_BYTES) {
      showToast('이미지 크기가 너무 커요. 2MB 이하의 사진을 선택해 주세요.');
      return;
    }

    try {
      const dataUrl = await resizeRocketgrowthImageToDataURL(file);
      const c = findRocketgrowthCard(cardId);
      if (!c) return;

      if (type === 'card') {
        c.image = dataUrl;
      } else if (type === 'bundle' && itemId) {
        const item = findRocketgrowthBundleItem(cardId, itemId);
        if (item) item.image = dataUrl;
      }

      const result = saveRocketgrowth();
      renderRocketgrowth();
      reportSaveResult(result, ROCKETGROWTH_CONFIG.MESSAGES, '사진을 변경했어요');
    } catch (err) {
      showToast('사진 처리 실패: ' + (err.message || ''));
    }
  });

  input.click();
}

/** 이미지를 리사이즈 + 압축해서 base64 DataURL로 반환 (localStorage 용량 절약) */
function resizeRocketgrowthImageToDataURL(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;
      const maxW = ROCKETGROWTH_CONFIG.IMAGE_MAX_WIDTH;
      const maxH = ROCKETGROWTH_CONFIG.IMAGE_MAX_HEIGHT;

      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      resolve(canvas.toDataURL('image/jpeg', ROCKETGROWTH_CONFIG.IMAGE_JPEG_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽을 수 없어요'));
    };

    img.src = url;
  });
}
