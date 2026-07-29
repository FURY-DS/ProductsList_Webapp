/* =====================================================
   smartstore-config.js - 스마트스토어 전용 설정
   ===================================================== */

const SMARTSTORE_CONFIG = {
  // 페이지 식별자 (내보내기/가져오기 검증용)
  PAGE_ID: 'smartstore',

  // 가져오기 호환 페이지 (수식/명칭이 동일한 페이지들)
  COMPATIBLE_PAGES: ['smartstore', 'coupang', 'esm', 'elevenst', 'ownerclan', 'domagguk', 'always', 'tossshopping'],

  // localStorage 키
  STORAGE_KEY: 'smartstore_v1',

  // 상품리스트 데이터를 읽어올 키 (config.js의 CONFIG.STORAGE_KEY와 동일)
  PRODUCTLIST_STORAGE_KEY: 'productlist_v1',

  // 레이아웃
  COLUMNS: 4,

  // 페이지 제목
  PAGE_TITLE: '스마트스토어',
  PAGE_HEADER: '스마트스토어',

  // 이미지 (localStorage 용량 절약을 위해 자동 리사이즈)
  IMAGE_MAX_SIZE_BYTES: 2 * 1024 * 1024,   // 원본 파일 크기 2MB 까지만 허용
  IMAGE_MAX_WIDTH:  800,                    // 리사이즈 시 가로 최대 픽셀
  IMAGE_MAX_HEIGHT: 800,                    // 리사이즈 시 세로 최대 픽셀
  IMAGE_JPEG_QUALITY: 0.8,                 // JPEG 압축 품질
  IMAGE_REMOVE_ON_SAVE_FAIL: true,         // 용량 초과 시 이미지 자동 제거 후 저장 시도

  // 통화 기호
  CURRENCY: {
    WON: '\u20A9' // ₩
  },

  // 필드 정의
  // 주의: warehouseFee/marketFee 필드키는 페이지별로 의미가 다릅니다.
  //   스마트스토어/쿠팡/ESM/11번가/도매꾹/올웨이즈/토스쇼핑: warehouseFee=창고택배비, marketFee=마켓택배비
  //   N배송: warehouseFee=창고택배비, marketFee=마켓택배비 (+ barcodeFee/pickingFee/tagFee)
  //   로켓그로스: warehouseFee=피킹라벨출고비, marketFee=쿠팡입출고비용 (★ 부호 반대: 최종이익에서 marketFee를 빼기(-))
  //   오너클랜: warehouseFee=창고택배비, marketFee=마켓택배비 (★ 수식이 다름: 공급가입력 기반)
  // 수식 공식:
  //   이 페이지(스마트스토어): 판매가 - 최종원가 - 판매수수료 - 창고택배비 + 마켓택배비 = 최종이익
  FIELDS: {
    sellerCode:    { label: '판매자상품코드 입력', type: 'text',   placeholder: '예: NYP0012' },
    itemTotal:     { label: '총합',                type: 'text',   placeholder: '자동 계산', readonly: true, highlight: true },
    name:          { label: '상품명',              type: 'text',   placeholder: '예: 무전조끼' },
    option:        { label: '옵션명',              type: 'text',   placeholder: '예: 블랙/카키/브라운' },
    finalCost:     { label: '최종원가',            type: 'text',   placeholder: '자동 입력', readonly: true, highlight: true },
    sellingPrice:  { label: '판매가',              type: 'number', placeholder: '예: 50000' },
    feeRate:       { label: '판매수수료',          type: 'number', placeholder: '0.1', extra: 'step="any"' },
    feeAmount:     { label: '판매수수료 금액',    type: 'text',   placeholder: '자동 계산', readonly: true, highlight: true },
    warehouseFee:  { label: '창고택배비',          type: 'number', placeholder: '예: 3000' },
    marketFee:     { label: '마켓택배비',          type: 'number', placeholder: '예: 3000' },
    finalProfit:   { label: '최종이익',            type: 'text',   placeholder: '자동 계산', readonly: true, highlight: true },
    multiBuyProfit:{ label: '2개이상구매',         type: 'text',   placeholder: '자동 계산', readonly: true, highlight: true }
  },

  // 메시지
  MESSAGES: {
    SAVED:                 '저장되었어요',
    SAVED_WITHOUT_IMAGES:  '사진 용량 때문에 이미지 없이 저장되었어요',
    SAVE_FAIL:       '저장 실패: ',
    SAVE_FAIL_QUOTA: '저장 공간이 부족해요. 상품리스트 사진 용량을 줄이거나 데이터를 정리해 주세요.',
    LOAD_FAIL:       '불러오기 실패',
    DELETED:         '삭제되었어요',
    ALL_DELETED:     '모두 삭제되었어요',
    NOTHING_DELETE:  '삭제할 데이터가 없어요',
    EXPORT_DONE:     '내보내기 완료',
    EXPORT_FAIL:     '내보내기 실패: ',
    IMPORT_DONE:     (n) => `${n}개 상품을 가져왔어요`,
    IMPORT_ADDED:    (n) => `${n}개 상품을 추가했어요`,
    IMPORT_FAIL:     '가져오기 실패: ',
    IMPORT_WRONG_PAGE: (pageName) => `이 파일은 '${pageName}' 페이지의 데이터입니다.\n스마트스토어 페이지에서는 가져올 수 없어요.`,
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
    SEARCH_PLACEHOLDER: '상품명, 옵션, 코드, 금액 등 전체 검색...',
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
    BTN_ADD_BUNDLE:   '+ 복수품 추가',
    BTN_ADD_ITEM:     '+',
    BTN_REMOVE_ITEM:  '－',
    ALL_COLLAPSED:   '모든 상품을 숨겼어요',
    ALL_EXPANDED:    '모든 상품을 펼쳤어요',
    PRODUCT_NOT_FOUND: (code) => `'${code}'에 해당하는 상품리스트 상품을 찾을 수 없어요`,
    BUNDLE:          '복수품'
  }
};
