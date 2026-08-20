/* =====================================================
   shared-card.js - 카드 렌더링/이벤트 공통 모듈
   10개 서브페이지의 card 파일이 이 모듈의 함수를 ctx와 함께 호출.
   페이지별 차이(수식, calcRows 레이아웃, syncFields 등)는 ctx로 전달.
   ===================================================== */

// ── 완전 공통 (페이지별 차이 없음) ──────────────────────

/** 상품 목록에서 판매자상품코드로 상품 찾기 (대소문자 무시 정확 일치) */
function lookupProductlistByCodeFromGeneric(code, products) {
  if (!code || !code.trim()) return null;
  const target = code.trim().toLowerCase();
  return products.find(p => String(p.ny || '').trim().toLowerCase() === target) || null;
}

/** 마켓노트 상품의 총합 계산: cost × rate × percent */
function computeProductlistTotalGeneric(product) {
  const cost = parseNum(product.cost);
  const rate = parseNum(product.rate);
  const pct  = parseNum(product.percent);
  return round2(cost * rate * pct);
}

/** 이미지 리사이즈 + 압축 → base64 DataURL (localStorage 용량 절약) */
function resizeImageToDataURLGeneric(file, config) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;
      const maxW = config.IMAGE_MAX_WIDTH;
      const maxH = config.IMAGE_MAX_HEIGHT;

      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx2d = canvas.getContext('2d');
      ctx2d.fillStyle = '#ffffff';
      ctx2d.fillRect(0, 0, width, height);
      ctx2d.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      resolve(canvas.toDataURL('image/jpeg', config.IMAGE_JPEG_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽을 수 없어요'));
    };

    img.src = url;
  });
}

// ── Lookup / Image (ctx 기반) ─────────────────────────

/** 페이지 컨텍스트로 마켓노트에서 코드 조회 */
function lookupProductlistByCodePage(ctx, code) {
  return lookupProductlistByCodeFromGeneric(code, ctx.loadProductlistData());
}

/** 마켓노트에서 코드에 해당하는 상품 이미지 가져오기 */
function getProductlistImagePage(ctx, code) {
  const product = lookupProductlistByCodePage(ctx, code);
  return product && product.image ? product.image : '';
}

/** 카드용 이미지 결정 (직접 업로드 우선, 없으면 마켓노트 조회) */
function getPageImage(ctx, card) {
  if (card.image) return card.image;
  return getProductlistImagePage(ctx, card.sellerCode);
}

/** 복수품 항목용 이미지 결정 */
function getPageBundleItemImage(ctx, item) {
  if (item.image) return item.image;
  return getProductlistImagePage(ctx, item.sellerCode);
}

// ── 코드 조회 → 카드/항목 업데이트 ─────────────────────

/** 단품: 판매자상품코드로 마켓노트에서 정보 불러오기 */
function updateSingleProductFromCodePage(ctx, card, code) {
  card.sellerCode = code;
  if (!code || !code.trim()) return;
  const product = lookupProductlistByCodePage(ctx, code);
  if (!product) {
    showToast(ctx.config.MESSAGES.PRODUCT_NOT_FOUND(code));
    return;
  }
  card.name = product.name || '';
  card.option = product.option || '';
  card.finalCost = ctx.computeProductlistTotal(product);
  ctx.recalc(card);
}

/** 복수품 항목: 판매자상품코드로 마켓노트에서 정보 불러오기 */
function updateBundleItemFromCodePage(ctx, card, itemId, code) {
  const item = ctx.findBundleItem(card.id, itemId);
  if (!item) return;
  item.sellerCode = code;
  if (!code || !code.trim()) return;
  const product = lookupProductlistByCodePage(ctx, code);
  if (!product) {
    showToast(ctx.config.MESSAGES.PRODUCT_NOT_FOUND(code));
    return;
  }
  item.name = product.name || '';
  item.option = product.option || '';
  item.total = ctx.computeProductlistTotal(product);
  ctx.recalc(card);
}

// ── 보드 / 렌더링 ─────────────────────────────────────

/** 보드 요소 초기화 */
function initPageBoard(ctx) {
  ctx.boardEl = document.getElementById('board');
  document.documentElement.style.setProperty('--columns', ctx.config.COLUMNS);
}

/**
 * 실제 화면 너비에 따른 컬럼 수를 CSS에서 읽어옴.
 * CSS 미디어 쿼리가 모바일에서 2열로 줄이면 JS도 같은 수만큼 열을 생성해야
 * 카드 순서가 자연스럽게 왼쪽→오른쪽, 위→아래로 배치됨.
 */
function getPageEffectiveColumns(ctx) {
  if (!ctx.boardEl) return ctx.config.COLUMNS;
  const cssColumns = parseInt(getComputedStyle(ctx.boardEl).getPropertyValue('--columns'), 10);
  if (!cssColumns || cssColumns < 1) return ctx.config.COLUMNS;
  return Math.min(ctx.config.COLUMNS, cssColumns);
}

/** 전체 렌더링 */
function renderCardsPage(ctx) {
  ctx.boardEl.innerHTML = '';
  ctx.updateSearchCount();
  ctx.updateToggleAllButton();

  if (ctx.state.cards.length === 0) {
    renderPageEmptyState(ctx, ctx.config.MESSAGES.EMPTY_TITLE, ctx.config.MESSAGES.EMPTY_DESC, true);
    return;
  }

  const q = ctx.searchQuery().trim();
  const filtered = ctx.state.cards
    .map((card, originalIdx) => ({ card, originalIdx }))
    .filter(({ card }) => ctx.matchesQuery(card, q));

  if (filtered.length === 0) {
    renderPageEmptyState(ctx, ctx.config.MESSAGES.NO_RESULT_TITLE, ctx.config.MESSAGES.NO_RESULT_DESC(escapeAttr(q)), false);
    return;
  }

  // CSS 미디어 쿼리 기준 실제 컬럼 수를 사용해 모바일 2열에서도 순서가 자연스럽게 유지됨
  const colCount = getPageEffectiveColumns(ctx);
  const cols = [];
  for (let i = 0; i < colCount; i++) {
    cols.push(document.createElement('div'));
  }
  filtered.forEach((entry, idx) => {
    cols[idx % colCount].appendChild(renderPageCard(ctx, entry.card, entry.originalIdx));
  });
  cols.forEach(c => ctx.boardEl.appendChild(c));
}

/** 빈 상태 렌더링 */
function renderPageEmptyState(ctx, title, desc, showAddBtn) {
  const empty = document.createElement('div');
  empty.className = 'empty';
  empty.style.gridColumn = '1 / -1';
  let html = `<h2>${title}</h2><p>${desc}</p>`;
  if (showAddBtn) {
    html += `<button class="btn btn-add" id="empty-add">${ctx.config.MESSAGES.EMPTY_ADD_BTN}</button>`;
  }
  empty.innerHTML = html;
  ctx.boardEl.appendChild(empty);
  if (showAddBtn) {
    document.getElementById('empty-add').addEventListener('click', ctx.addCard);
  }
}

/** 개별 카드 렌더링 */
function renderPageCard(ctx, card, idx) {
  const wrap = document.createElement('div');
  const extraClass = ctx.cardClass ? ' ' + ctx.cardClass : '';
  wrap.className = 'card' + extraClass + ' product-card'
    + (card.isEditing ? '' : ' saved')
    + (card.isCollapsed ? ' collapsed' : '');
  wrap.dataset.id = card.id;

  // ----- Header -----
  const header = document.createElement('div');
  header.className = 'card-header';
  const actionBtn = card.isEditing
    ? `<button class="btn btn-add" data-action="save" title="입력한 내용 저장">${ctx.config.MESSAGES.BTN_SAVE}</button>`
    : `<button class="btn btn-cancel" data-action="edit" title="다시 수정하기">${ctx.config.MESSAGES.BTN_EDIT}</button>`;

  const toggleBtn = card.isCollapsed
    ? `<button class="btn btn-toggle" data-action="expand" title="상세 정보 펼치기">${ctx.config.MESSAGES.BTN_EXPAND}</button>`
    : `<button class="btn btn-toggle" data-action="collapse" title="상세 정보 숨기기">${ctx.config.MESSAGES.BTN_COLLAPSE}</button>`;

  const sellerCodeHtml = !card.isBundle && card.isEditing
    ? `<div class="field seller-code-field"><label>${ctx.config.FIELDS.sellerCode.label}</label><input type="text" name="sellerCode" value="${escapeAttr(card.sellerCode)}" placeholder="${escapeAttr(ctx.config.FIELDS.sellerCode.placeholder)}" /></div>`
    : (!card.isBundle && !card.isEditing
        ? `<span class="card-badge" title="${escapeAttr(ctx.config.FIELDS.sellerCode.label)}">${escapeAttr(card.sellerCode || '')}</span>`
        : `<span class="card-badge bundle-badge">${escapeAttr(ctx.config.MESSAGES.BUNDLE)}</span>`);

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
    wrap.appendChild(renderPagePhotoRow(ctx, card));
  } else {
    wrap.appendChild(renderPagePhotoRow(ctx, card));
    wrap.appendChild(ctx.renderCalcRows(card));
    if (card.isBundle) {
      wrap.appendChild(renderPageBundleSection(ctx, card));
    }

    // 복수품 전환 버튼 (단품 모드 편집 중)
    if (!card.isBundle && card.isEditing) {
      const bundleAdd = document.createElement('div');
      bundleAdd.className = 'bundle-add';
      bundleAdd.innerHTML = `<button class="btn btn-toggle" data-action="add-bundle-mode">${ctx.config.MESSAGES.BTN_ADD_BUNDLE}</button>`;
      wrap.appendChild(bundleAdd);
    }

    // ----- Footer -----
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    footer.innerHTML = `
      <button class="btn btn-add" data-action="add">${ctx.config.MESSAGES.BTN_ADD}</button>
      <button class="btn btn-remove" data-action="delete">${ctx.config.MESSAGES.BTN_DELETE}</button>
    `;
    wrap.appendChild(footer);
  }

  bindPageCardEvents(ctx, wrap, card);
  return wrap;
}

/** 사진 + 상품명/옵션명 row */
function renderPagePhotoRow(ctx, card) {
  const row = document.createElement('div');
  row.className = 'card-row';

  const imgSrc = getPageImage(ctx, card);
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
  fields.appendChild(makePageField(ctx, 'name', card.name, !card.isEditing));
  fields.appendChild(makePageField(ctx, 'option', card.option, !card.isEditing));
  row.appendChild(fields);

  return row;
}

/** 판매수수료 필드 (라벨 옆에 비율 입력, 아래에 금액 표시) */
function makePageFeeField(ctx, card) {
  const f = document.createElement('div');
  f.className = 'field fee-field';
  const def = ctx.config.FIELDS.feeRate;
  const roAttr = !card.isEditing ? 'readonly' : '';
  f.innerHTML = `
    <label>
      ${def.label}
      <input type="${def.type}" name="feeRate" class="fee-rate" value="${escapeAttr(card.feeRate)}" placeholder="${escapeAttr(def.placeholder)}" ${def.extra || ''} ${roAttr} />
    </label>
    <input type="text" name="feeAmount" class="highlight" readonly value="${escapeAttr(formatNumber(parseNum(card.feeAmount)))}" placeholder="${escapeAttr(ctx.config.FIELDS.feeAmount.placeholder)}" />
  `;
  return f;
}

/** 단일 입력 필드 생성 */
function makePageField(ctx, name, value, readonly) {
  const def = ctx.config.FIELDS[name];
  if (!def) return document.createElement('div');

  const f = document.createElement('div');
  f.className = 'field' + (ctx.autoFieldNames.indexOf(name) >= 0 ? ' auto-field' : '');
  const safeVal = value == null ? '' : value;
  const roAttr = readonly || def.readonly ? 'readonly' : '';
  const extra = def.extra || '';
  const highlightClass = def.highlight ? 'highlight' : '';

  // 읽기 전용 숫자/계산 필드는 콤마 + 소수점 2자리 포맷 적용
  const isReadonlyNumber = (readonly || def.readonly) && def.type === 'number';
  const inputType = isReadonlyNumber ? 'text' : def.type;
  const displayVal = isReadonlyNumber ? formatNumber(parseNum(safeVal)) : escapeAttr(String(safeVal));

  f.innerHTML = `
    <label>${def.label}</label>
    <input type="${inputType}" name="${name}" value="${displayVal}" placeholder="${escapeAttr(def.placeholder)}" ${extra} class="${highlightClass}" ${roAttr} />
  `;
  return f;
}

// ── 복수품 섹션 ───────────────────────────────────────

/** 복수품 항목 섹션 렌더링 */
function renderPageBundleSection(ctx, card) {
  const section = document.createElement('div');
  section.className = 'bundle-section';

  const title = document.createElement('div');
  title.className = 'bundle-title';
  title.textContent = ctx.config.MESSAGES.BUNDLE;
  section.appendChild(title);

  const list = document.createElement('div');
  list.className = 'bundle-list';
  card.bundleItems.forEach((item, idx) => {
    list.appendChild(renderPageBundleItem(ctx, card, item, idx));
  });
  section.appendChild(list);

  if (card.isEditing) {
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-add bundle-add-item';
    addBtn.dataset.action = 'add-bundle-item';
    addBtn.textContent = ctx.config.MESSAGES.BTN_ADD_ITEM + ' ' + ctx.config.MESSAGES.BUNDLE;
    section.appendChild(addBtn);
  }

  return section;
}

/** 복수품 항목 row 렌더링 */
function renderPageBundleItem(ctx, card, item, idx) {
  const row = document.createElement('div');
  row.className = 'bundle-item';
  row.dataset.itemId = item.id;

  const thumbSrc = getPageBundleItemImage(ctx, item);
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
    <label>${ctx.config.FIELDS.sellerCode.label}</label>
    <input type="text" name="itemSellerCode" value="${escapeAttr(item.sellerCode)}" placeholder="${escapeAttr(ctx.config.FIELDS.sellerCode.placeholder)}" ${roAttr} />
  `;
  fieldsWrap.appendChild(codeField);

  const totalField = document.createElement('div');
  totalField.className = 'field bundle-total-field';
  totalField.innerHTML = `
    <label>${ctx.config.FIELDS.itemTotal.label}</label>
    <input type="text" name="itemTotal" class="highlight" readonly value="${escapeAttr(formatNumber(parseNum(item.total)))}" placeholder="${escapeAttr(ctx.config.FIELDS.itemTotal.placeholder)}" />
  `;
  fieldsWrap.appendChild(totalField);

  row.appendChild(fieldsWrap);

  if (card.isEditing) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-remove bundle-remove';
    removeBtn.dataset.action = 'remove-bundle-item';
    removeBtn.title = '이 항목 삭제';
    removeBtn.textContent = ctx.config.MESSAGES.BTN_REMOVE_ITEM;
    row.appendChild(removeBtn);
  }

  return row;
}

// ── 이벤트 바인딩 ─────────────────────────────────────

/** 카드 내 이벤트 바인딩 */
function bindPageCardEvents(ctx, wrap, card) {
  // 입력 변경 (실시간 계산용)
  wrap.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.name) return;
    const c = ctx.findCard(card.id);
    if (!c) return;

    // 판매자상품코드는 change(Enter/Blur) 시 조회
    if (t.name === 'sellerCode' || t.name === 'itemSellerCode') return;

    if (c.isEditing) {
      c[t.name] = t.value;
      ctx.recalc(c);
      reportSaveResult(ctx.save(), ctx.config.MESSAGES);
      ctx.updateCalcDisplay(wrap, c);
    }
  });

  // 판매자상품코드 조회는 change 이벤트에서 처리
  wrap.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.name) return;
    const c = ctx.findCard(card.id);
    if (!c) return;

    if (t.name === 'sellerCode') {
      c.sellerCode = t.value;
      updateSingleProductFromCodePage(ctx, c, t.value);
      reportSaveResult(ctx.save(), ctx.config.MESSAGES);
      renderCardsPage(ctx);
      return;
    }

    if (t.name === 'itemSellerCode') {
      const itemId = t.closest('.bundle-item')?.dataset.itemId;
      if (itemId) {
        updateBundleItemFromCodePage(ctx, c, itemId, t.value);
        reportSaveResult(ctx.save(), ctx.config.MESSAGES);
        renderCardsPage(ctx);
      }
    }
  });

  // 버튼 클릭
  wrap.addEventListener('click', (e) => {
    // 사진 박스 / 복수품 썸네일 클릭 → 사진 업로드
    const photoBox = e.target.closest('.photo-box');
    const bundleThumb = e.target.closest('.bundle-thumb');
    if (photoBox || bundleThumb) {
      const c = ctx.findCard(card.id);
      if (!c) return;

      if (!c.isEditing) {
        c.isEditing = true;
        c.isCollapsed = false;
        reportSaveResult(ctx.save(), ctx.config.MESSAGES);
        renderCardsPage(ctx);
      }

      if (photoBox) {
        triggerPagePhotoUpload(ctx, c.id, 'card');
      } else {
        const itemId = bundleThumb.closest('.bundle-item')?.dataset.itemId;
        if (itemId) triggerPagePhotoUpload(ctx, c.id, 'bundle', itemId);
      }
      return;
    }

    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'add') {
      ctx.addCardAfter(card.id);
    } else if (action === 'delete') {
      ctx.confirmDelete(card.id);
    } else if (action === 'save') {
      savePageCard(ctx, card.id);
    } else if (action === 'edit') {
      editPageCard(ctx, card.id);
    } else if (action === 'collapse' || action === 'expand') {
      togglePageCardCollapse(ctx, card.id);
    } else if (action === 'add-bundle-mode') {
      enablePageBundleMode(ctx, card.id);
    } else if (action === 'add-bundle-item') {
      ctx.addBundleItem(card.id);
    } else if (action === 'remove-bundle-item') {
      const itemId = btn.closest('.bundle-item')?.dataset.itemId;
      if (itemId) ctx.removeBundleItem(card.id, itemId);
    }
  });
}

// ── 카드 액션 (save / edit / collapse / photo) ─────────

/** 모든 카드 한 번에 접기/펼치기 */
function toggleAllPageCards(ctx, collapse) {
  if (ctx.state.cards.length === 0) return;
  ctx.state.cards.forEach(c => c.isCollapsed = collapse);
  const result = ctx.save();
  renderCardsPage(ctx);
  reportSaveResult(result, ctx.config.MESSAGES, collapse ? ctx.config.MESSAGES.ALL_COLLAPSED : ctx.config.MESSAGES.ALL_EXPANDED);
}

/** 카드 저장 */
function savePageCard(ctx, cardId) {
  const c = ctx.findCard(cardId);
  if (!c) return;
  syncPageCardFromDOM(ctx, cardId);
  c.isEditing = false;
  const result = ctx.save();
  renderCardsPage(ctx);
  reportSaveResult(result, ctx.config.MESSAGES, ctx.config.MESSAGES.SAVED);
}

/** 렌더링된 DOM의 현재 입력값을 상태 객체에 동기화 */
function syncPageCardFromDOM(ctx, cardId) {
  const card = ctx.findCard(cardId);
  if (!card) return;
  const wrap = document.querySelector(`.product-card[data-id="${cardId}"]`);
  if (!wrap) return;

  const getVal = (name) => {
    const el = wrap.querySelector(`[name="${name}"]`);
    return el ? el.value : undefined;
  };

  if (!card.isBundle) {
    const sc = getVal('sellerCode');
    if (sc !== undefined) card.sellerCode = sc;
  }

  ctx.syncFields.forEach(k => {
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
function editPageCard(ctx, cardId) {
  const c = ctx.findCard(cardId);
  if (!c) return;
  c.isEditing = true;
  c.isCollapsed = false;
  reportSaveResult(ctx.save(), ctx.config.MESSAGES);
  renderCardsPage(ctx);
  setTimeout(() => {
    const el = document.querySelector(`.product-card[data-id="${cardId}"] input[name="sellerCode"], .product-card[data-id="${cardId}"] input[name="itemSellerCode"]`);
    if (el) el.focus();
  }, 50);
}

/** 카드 접기/펼치기 */
function togglePageCardCollapse(ctx, cardId) {
  const c = ctx.findCard(cardId);
  if (!c) return;
  c.isCollapsed = !c.isCollapsed;
  reportSaveResult(ctx.save(), ctx.config.MESSAGES);
  renderCardsPage(ctx);
}

/** 단품 카드를 복수품 모드로 전환 */
function enablePageBundleMode(ctx, cardId) {
  const c = ctx.findCard(cardId);
  if (!c) return;
  c.isBundle = true;
  c.sellerCode = '';
  c.bundleItems = [ctx.newBundleItem()];
  ctx.recalc(c);
  reportSaveResult(ctx.save(), ctx.config.MESSAGES);
  renderCardsPage(ctx);
}

/** 사진 업로드 트리거 (단품 / 복수품 항목) */
function triggerPagePhotoUpload(ctx, cardId, type, itemId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > ctx.config.IMAGE_MAX_SIZE_BYTES) {
      showToast('이미지 크기가 너무 커요. 2MB 이하의 사진을 선택해 주세요.');
      return;
    }

    try {
      const dataUrl = await resizeImageToDataURLGeneric(file, ctx.config);
      const c = ctx.findCard(cardId);
      if (!c) return;

      if (type === 'card') {
        c.image = dataUrl;
      } else if (type === 'bundle' && itemId) {
        const item = ctx.findBundleItem(cardId, itemId);
        if (item) item.image = dataUrl;
      }

      const result = ctx.save();
      renderCardsPage(ctx);
      reportSaveResult(result, ctx.config.MESSAGES, '사진을 변경했어요');
    } catch (err) {
      showToast('사진 처리 실패: ' + (err.message || ''));
    }
  });

  input.click();
}

// ── 데이터 연동 ───────────────────────────────────────

/** 저장된 데이터에서 판매자상품코드 다시 조회 및 계산 */
function resolvePageCards(ctx) {
  const products = ctx.loadProductlistData();
  if (!products.length) return;

  ctx.state.cards.forEach(c => {
    if (c.isBundle) {
      c.bundleItems.forEach(item => {
        if (!item.sellerCode || !item.sellerCode.trim()) return;
        const product = lookupProductlistByCodeFromGeneric(item.sellerCode, products);
        if (!product) return;
        if (product.name) item.name = product.name;
        if (product.option) item.option = product.option;
        item.total = ctx.computeProductlistTotal(product);
      });
    } else if (c.sellerCode && c.sellerCode.trim()) {
      const product = lookupProductlistByCodeFromGeneric(c.sellerCode, products);
      if (!product) return;
      if (product.name) c.name = product.name;
      if (product.option) c.option = product.option;
      c.finalCost = ctx.computeProductlistTotal(product);
    }
    ctx.recalc(c);
  });
}
