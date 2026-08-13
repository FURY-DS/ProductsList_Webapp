/* =====================================================
   config.js - 설정 및 상수 (하드코딩 제거)
   모든 매직 넘버, 문자열, 필드 정의를 한 곳에서 관리
   ===================================================== */

const CONFIG = {
  // 페이지 식별자 (내보내기/가져오기 검증용)
  PAGE_ID: 'productlist',

  // localStorage 키
  STORAGE_KEY: 'productlist_v1',

  // 레이아웃
  COLUMNS: 4,

  // 카드 헤더 (#01 옆)에 표시할 필드 키
  CARD_HEADER_BADGE_FIELD: 'ny',

  // 카드 헤더 (#01 옆)에 입력창으로 표시할 필드 키 (원산지)
  CARD_HEADER_ORIGIN_FIELD: 'origin',
  // 원산지 자동완성 후보 (자유 입력도 가능)
  ORIGIN_SUGGESTIONS: ['중국', '일본', '태국', '베트남'],

  // 카드 헤더 원산지 옆에 선택창으로 표시할 필드 키 (진행 상태)
  CARD_HEADER_STATUS_FIELD: 'status',
  STATUS_OPTIONS: ['진행중', '진행중단', '테스트중', '예정'],

  // 이미지 업로드 제한 (바이트)
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB

  // 용량 초과 시 이미지 자동 제거 후 저장 시도
  IMAGE_REMOVE_ON_SAVE_FAIL: true,

  // 토스트 표시 시간 (ms)
  TOAST_DURATION: 1800,

  // 통화 기호
  CURRENCY: {
    COST: '\u00A5',   // ¥ (위안화 - 원가)
    RATE: '\u20A9',   // ₩ (원화 - 환율)
    TOTAL: '\u20A9'   // ₩ (원화 - 총합)
  },

  // 페이지 제목
  PAGE_TITLE: '마켓노트',
  PAGE_HEADER: '마켓노트',

  // 메뉴 항목 (드롭다운) - page 파일과 연결
  MENU_ITEMS: [
    { page: 'products',     label: '마켓노트',   url: 'index.html',        active: true,  ready: true },
    {
      page: 'marketplace',
      label: 'KR 한국마켓',
      children: [
        { page: 'nshipping',    label: 'N배송',        url: 'nshipping.html',    ready: true },
        { page: 'rocketgrowth', label: '로켓그로스',   url: 'rocketgrowth.html', ready: true },
        { page: 'smartstore',   label: '스마트스토어', url: 'smartstore.html',   ready: true },
        { page: 'coupang',      label: '쿠팡',         url: 'coupang.html',      ready: true },
        { page: 'esm',          label: 'ESM',          url: 'esm.html',          ready: true },
        { page: 'elevenst',     label: '11번가',       url: 'elevenst.html',     ready: true },
        { page: 'ownerclan',    label: '오너클랜',     url: 'ownerclan.html',    ready: true },
        { page: 'domagguk',     label: '도매꾹',       url: 'domagguk.html',     ready: true },
        { page: 'always',       label: '올웨이즈',     url: 'always.html',       ready: true },
        { page: 'tossshopping', label: '토스쇼핑',     url: 'tossshopping.html', ready: true }
      ]
    },
    { page: 'jp-marketplace', label: 'JP 일본마켓', url: '#', ready: false },
    { page: 'us-marketplace', label: 'US 미국마켓', url: '#', ready: false }
  ],

  // 필드 정의 - 카드에 표시되는 입력 필드
  // name: 데이터 키, label: 표시 라벨, type: input type, placeholder, extra: 추가 속성
  FIELDS: {
    name:      { label: '상품명',          type: 'text',   placeholder: '예: 가방 / 신발' },
    option:    { label: '옵션명',          type: 'text',   placeholder: '예: 블랙 / L' },
    origin:    { label: '원산지',          type: 'text',   placeholder: '예: 중국' },
    status:    { label: '진행상태',        type: 'select', placeholder: '상태' },
    cost:      { label: '원가',            type: 'number', placeholder: '예: 15' },
    rate:      { label: '환율',            type: 'number', placeholder: '예: 215' },
    percent:   { label: '퍼센트',          type: 'number', placeholder: '예: 0.16', extra: 'step="any"' },
    link:      { label: '링크 (URL)',      type: 'url',    placeholder: 'https://...' },
    link2:     { label: '링크 (URL)',      type: 'url',    placeholder: 'https://...' },
    rocket:    { label: '로켓배송코드',        type: 'text',   placeholder: '' },
    nshipping: { label: 'N배송코드',       type: 'text',   placeholder: '' },
    product:   { label: '엔와이창고 바코드',        type: 'text',   placeholder: '' },
    ny:        { label: '판매자상품코드', type: 'text',   placeholder: '' }
  },

  // 카드 내 필드 배치 순서 (row 단위)
  // type: 'photo+fields' | 'row'
  //   photo+fields: 사진 + 필드 나란히
  //   row: field-row (className으로 열 수 지정)
  // total: true면 총합 필드를 row 끝에 추가
  CARD_LAYOUT: [
    { type: 'photo+fields', fields: ['name', 'option'] },
    { type: 'row', className: 'three', fields: ['cost', 'rate', 'percent'], total: true },
    { type: 'row', className: 'one',   fields: ['link'] },
    { type: 'row', className: 'one',   fields: ['link2'] },
    { type: 'row', className: 'four',  fields: ['rocket', 'nshipping', 'product', 'ny'] }
  ],

  // 총합 계산에 사용되는 필드
  TOTAL_FIELDS: ['cost', 'rate', 'percent'],

  // CSV 컬럼 순서 (엑셀 템플릿 및 가져오기용)
  // 엑셀 헤더명 → 필드 키 매핑
  CSV_COLUMNS: [
    { header: '상품명',         key: 'name' },
    { header: '옵션명',         key: 'option' },
    { header: '원산지',         key: 'origin' },
    { header: '진행상태',       key: 'status' },
    { header: '원가',           key: 'cost' },
    { header: '환율',           key: 'rate' },
    { header: '퍼센트',         key: 'percent' },
    { header: '링크1',          key: 'link' },
    { header: '링크2',          key: 'link2' },
    { header: '로켓배송코드',   key: 'rocket' },
    { header: 'N배송코드',      key: 'nshipping' },
    { header: '엔와이창고바코드', key: 'product' },
    { header: '판매자상품코드', key: 'ny' }
  ],

  // 메시지 (토스트 / 모달)
  MESSAGES: {
    SAVED:           '저장되었어요',
    SAVED_WITHOUT_IMAGES: '사진 용량 때문에 이미지 없이 저장되었어요',
    SAVE_FAIL:       '저장 실패: ',
    SAVE_FAIL_QUOTA: '저장 공간이 부족해요. 불필요한 데이터를 삭제해 주세요.',
    LOAD_FAIL:       '불러오기 실패',
    DELETED:         '삭제되었어요',
    ALL_DELETED:     '모두 삭제되었어요',
    NOTHING_DELETE:  '삭제할 데이터가 없어요',
    EXPORT_DONE:     '내보내기 완료',
    EXPORT_ALL_DONE: '전체 데이터를 내보내기 완료',
    EXPORT_ALL_FAIL: '전체 내보내기 실패: ',
    IMPORT_ALL_TITLE: '전체 가져오기',
    IMPORT_ALL_TEXT: (n) => `총 ${n}개 페이지 데이터를 교체할까요?
기존 데이터는 덮어써져요.`,
    IMPORT_ALL_DONE: (n) => `${n}개 페이지 데이터를 가져왔어요`,
    IMPORT_ALL_FAIL: '전체 가져오기 실패: ',
    IMPORT_ALL_WRONG_FILE: '전체 데이터 파일이 아니에요',
    EXPORT_FAIL:     '내보내기 실패: ',
    IMAGE_TOO_BIG:   '이미지는 5MB 이하만 가능해요',
    IMAGE_ADDED:     '사진이 등록되었어요',
    IMAGE_REMOVED:   '사진이 삭제되었어요',
    IMPORT_DONE:     (n) => `${n}개 상품을 가져왔어요`,
    IMPORT_ADDED:    (n) => `${n}개 상품을 추가했어요`,
    IMPORT_FAIL:     '가져오기 실패: ',
    IMPORT_WRONG_PAGE: (pageName) => `이 파일은 '${pageName}' 페이지의 데이터입니다.\n마켓노트 페이지에서는 가져올 수 없어요.`,
    PAGE_COMING:     (name) => `${name} 페이지는 준비 중이에요`,
    DELETE_TITLE:    '정말 삭제할까요?',
    DELETE_TEXT:     (label) => `${label}을(를) 삭제하면 복구할 수 없어요. 계속할까요?`,
    CLEAR_TITLE:     '전체 삭제',
    CLEAR_TEXT:      (n) => `등록된 ${n}개 상품을 모두 삭제할까요?\n이 작업은 되돌릴 수 없어요.`,
    IMPORT_TITLE:    '가져오기',
    IMPORT_TEXT:     (n) => `기존 데이터 ${n}개를 교체할까요?\n(취소 시 기존 데이터에 추가돼요)`,
    EMPTY_TITLE:     '아직 등록된 상품이 없어요',
    EMPTY_DESC:      '아래 버튼을 눌러 첫 상품을 추가해 보세요.',
    EMPTY_ADD_BTN:   '+ 상품 추가',
    NO_RESULT_TITLE: '검색 결과가 없어요',
    NO_RESULT_DESC:  (q) => `"${q}"와(과) 일치하는 상품이 없습니다.`,
    SEARCH_PLACEHOLDER: '상품명, 옵션, 코드, 링크, 가격 등 전체 검색...',
    BTN_ADD:         '＋ 상품 추가',
    BTN_DELETE:      '－ 카드 삭제',
    BTN_SAVE:        '저장',
    BTN_EDIT:        '수정',
    BTN_CANCEL:      '취소',
    BTN_CONFIRM_DEL: '삭제',
    BTN_COLLAPSE:    '숨기기',
    BTN_EXPAND:      '펼치기',
    BTN_COLLAPSE_ALL: '전체 숨기기',
    BTN_EXPAND_ALL:   '전체 펼치기',
    ALL_COLLAPSED:   '모든 상품을 숨겼어요',
    ALL_EXPANDED:    '모든 상품을 펼쳤어요',
    CSV_TEMPLATE_DONE: '엑셀 템플릿을 다운로드했어요',
    CSV_IMPORT_DONE:   (n) => `${n}개 상품을 엑셀에서 가져왔어요`,
    CSV_IMPORT_ADDED:  (n) => `${n}개 상품을 추가했어요`,
    CSV_IMPORT_FAIL:   '엑셀 가져오기 실패: ',
    CSV_EMPTY:         '엑셀 파일에 데이터가 없어요',
    CSV_BAD_HEADER:    '엑셀 헤더(첫 행)가 올바르지 않아요.\n템플릿을 다운로드해서 사용해 주세요.',
    CSV_IMPORT_TITLE:  '엑셀 가져오기',
    CSV_IMPORT_TEXT:   (imp, existing) => `엑셀에서 ${imp}개 상품을 불러왔어요.\n기존 데이터 ${existing}개를 교체할까요?\n(취소 시 기존 데이터에 추가돼요)`
  }
};
