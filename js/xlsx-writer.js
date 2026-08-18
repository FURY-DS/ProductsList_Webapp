/* =====================================================
   xlsx-writer.js - 의존성 없는 최소 .xlsx 생성기
   - 외부 라이브러리/CDN 없이 순수 JS로 동작 (file:// 환경 지원)
   - ZIP 무압축(store) + CRC32 + 최소 OOXML 구조
   - 사용: XLSX_WRITER.buildXlsx([{ name, rows, colWidths, boldHeader }])
     → Blob (application/vnd...spreadsheetml.sheet)
   - 셀 값: 문자열/숫자 또는 { t:'image', data:'data:image/png;base64,...' }
     (이미지 셀은 실제 이미지로 시트에 임베드됨)
   ===================================================== */

const XLSX_WRITER = (() => {

  /* ---------- CRC32 ---------- */
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* ---------- base64 → Uint8Array ---------- */
  function base64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* ---------- data URL 파싱 ---------- */
  function parseDataUrl(url) {
    const m = /^data:image\/([a-zA-Z0-9+]+);base64,(.*)$/.exec(url || '');
    if (!m) return null;
    let ext = m[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    return { ext, bytes: base64ToBytes(m[2]) };
  }

  /* ---------- ZIP (무압축 store 방식) ---------- */
  function makeZip(files) {
    const chunks = [];
    const central = [];
    let offset = 0;

    for (const f of files) {
      const nameBytes = new TextEncoder().encode(f.name);
      const crc = crc32(f.data);

      // Local File Header (30 bytes + name)
      const local = new Uint8Array(30 + nameBytes.length);
      const dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true);   // signature
      dv.setUint16(4, 20, true);           // version needed
      dv.setUint16(6, 0, true);            // flags
      dv.setUint16(8, 0, true);            // method: store
      dv.setUint16(10, 0, true);           // mod time
      dv.setUint16(12, 0x21, true);        // mod date (고정값, 무의미)
      dv.setUint32(14, crc, true);         // crc32
      dv.setUint32(18, f.data.length, true);   // compressed size
      dv.setUint32(22, f.data.length, true);   // uncompressed size
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);           // extra len
      local.set(nameBytes, 30);

      chunks.push(local, f.data);

      // Central Directory Header (46 bytes + name)
      const cd = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);           // version made by
      cv.setUint16(6, 20, true);           // version needed
      cv.setUint16(8, 0, true);            // flags
      cv.setUint16(10, 0, true);           // method: store
      cv.setUint16(12, 0, true);           // mod time
      cv.setUint16(14, 0x21, true);        // mod date
      cv.setUint32(16, crc, true);
      cv.setUint32(20, f.data.length, true);
      cv.setUint32(24, f.data.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint32(42, offset, true);      // local header offset
      cd.set(nameBytes, 46);
      central.push(cd);

      offset += local.length + f.data.length;
    }

    const centralSize = central.reduce((s, c) => s + c.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);

    return new Blob([...chunks, ...central, eocd], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  /* ---------- XML 헬퍼 ---------- */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** 0-based 열 인덱스 → A1 표기 열 이름 (0→A, 25→Z, 26→AA) */
  function colName(i) {
    let s = '';
    i += 1;
    while (i > 0) {
      const m = (i - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  }

  /* ---------- 셀 XML 생성 ---------- */
  function isImageCell(cell) {
    return cell && typeof cell === 'object' && cell.t === 'image' && typeof cell.data === 'string';
  }

  function buildCellXml(ref, cell, style) {
    if (isImageCell(cell)) {
      // 이미지가 있는 셀은 값 없이 비워둠 (이미지는 drawing으로 별도 배치)
      return '';
    }
    if (cell === null || cell === undefined || cell === '') return '';
    if (typeof cell === 'number' && isFinite(cell)) {
      return `<c r="${ref}"${style}><v>${cell}</v></c>`;
    }
    return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(cell)}</t></is></c>`;
  }

  /* ---------- 이미지 처리 ---------- */
  // 한 셀의 컬럼 너비(문자단위) 합 → 시작 X EMU
  // Excel 컬럼너비 1단위 ≈ 7px @ 96dpi = 66,675 EMU
  function colOffset(colIdx, colWidths) {
    if (!Array.isArray(colWidths)) return colIdx * 9525; // fallback
    let px = 0;
    for (let i = 0; i < colIdx && i < colWidths.length; i++) {
      px += (colWidths[i] || 8) * 7;
    }
    return px * 9525;
  }
  // 행 → 시작 Y EMU (15pt 기본 행 높이 = 190,500 EMU)
  function rowOffset(rowIdx) {
    return rowIdx * 190500;
  }

  function buildDrawingXml(anchors) {
    // anchors: [{ col, row, w, h, relId, picId }]
    // [주의] <xdr:clientData/> 는 <xdr:oneCellAnchor>의 직속 자식(즉 <xdr:pic>의 형제)이어야 함.
    //        <xdr:pic> 안에 들어가면 Excel이 "그리기" 부분 복구 메시지를 띄움.
    const parts = [];
    anchors.forEach(a => {
      const cx = (a.w || 90) * 9525;
      const cy = (a.h || 90) * 9525;
      parts.push(
        '<xdr:oneCellAnchor>'
        + `<xdr:from><xdr:col>${a.col}</xdr:col><xdr:colOff>0</xdr:colOff>`
        + `<xdr:row>${a.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>`
        + `<xdr:ext cx="${cx}" cy="${cy}"/>`
        + `<xdr:pic>`
        + `<xdr:nvPicPr>`
        + `<xdr:cNvPr id="${a.picId}" name="Picture ${a.picId}" descr=""/>`
        + `<xdr:cNvPicPr/>`
        + `</xdr:nvPicPr>`
        + `<xdr:blipFill>`
        + `<a:blip cstate="print" r:embed="${a.relId}"/>`
        + `<a:stretch><a:fillRect/></a:stretch>`
        + `</xdr:blipFill>`
        + `<xdr:spPr><a:prstGeom prst="rect"/></xdr:spPr>`
        + `</xdr:pic>`
        + `<xdr:clientData/>`
        + `</xdr:oneCellAnchor>`
      );
    });
    return XML_HEAD
      + '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"'
      + ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
      + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + parts.join('')
      + '</xdr:wsDr>';
  }

  function buildDrawingRels(rels) {
    // rels: [{ relId, target }]
    const parts = rels.map(r =>
      `<Relationship Id="${r.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${esc(r.target)}"/>`
    );
    return XML_HEAD
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + parts.join('')
      + '</Relationships>';
  }

  /* ---------- sheet XML ---------- */
  // 셀 높이 단위는 pt (xdr과 달리 worksheet의 ht 속성은 포인트 단위!)
  // 96dpi에서 1px = 0.75pt. 이미지 셀 행은 이미지 높이(px) + 위아래 패딩 6pt
  function pxToRowPoints(px) {
    return Math.round(px * 0.75 + 6);
  }
  const DEFAULT_ROW_PT = 15; // 15pt 기본 (Excel 표준 행 높이)

  function sheetXml(sheet, drawing, imageRowMap) {
    const rows = sheet.rows || [];
    let xml = XML_HEAD
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
      + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';

    // 기본 행 높이 (이미지 없는 행에 적용)
    xml += `<sheetFormatPr defaultRowHeight="${DEFAULT_ROW_PT}"/>`;

    if (Array.isArray(sheet.colWidths) && sheet.colWidths.length) {
      xml += '<cols>'
        + sheet.colWidths.map((w, i) =>
            `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')
        + '</cols>';
    }

    xml += '<sheetData>';
    rows.forEach((row, r) => {
      const ht = imageRowMap && imageRowMap[r];
      const rowAttr = ht
        ? ` r="${r + 1}" ht="${ht}" customHeight="1"`
        : ` r="${r + 1}"`;
      xml += `<row${rowAttr}>`;
      row.forEach((cell, c) => {
        if (isImageCell(cell)) return; // 이미지 셀은 drawing으로 처리
        const style = (r === 0 && sheet.boldHeader) ? ' s="1"' : '';
        xml += buildCellXml(colName(c) + (r + 1), cell, style);
      });
      xml += '</row>';
    });
    xml += '</sheetData>';

    if (drawing) {
      xml += `<drawing r:id="${drawing.relId}"/>`;
    }

    xml += '</worksheet>';
    return xml;
  }

  const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  /* ---------- 공개 API ---------- */
  /**
   * .xlsx Blob 생성
   * @param {Array} sheets - [{ name, rows(2차원 배열), colWidths(선택), boldHeader(선택) }]
   *   셀 값: 문자열, 숫자, 또는 { t:'image', data:'data:image/png;base64,...', w?, h? }
   * @returns {Blob}
   */
  function buildXlsx(sheets) {
    const enc = new TextEncoder();
    const files = [];

    const safeSheets = (sheets || []).map((s, i) => ({
      ...s,
      name: String(s.name || ('Sheet' + (i + 1)))
        .replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31)
    }));

    /* ---- 1) 시트별로 이미지 수집 → 전역 media 등록 ---- */
    const mediaExts = new Set(); // [Content_Types].xml의 Default 확장자용
    const mediaFiles = []; // { name, bytes }
    const sheetImages = []; // 시트별 anchor/rel/행높이 정보

    safeSheets.forEach((sheet, sIdx) => {
      const rows = sheet.rows || [];
      const anchors = [];
      const rels = [];
      const imageRowMap = {}; // rIdx -> twips(이미지 행 높이)

      rows.forEach((row, rIdx) => {
        row.forEach((cell, cIdx) => {
          if (!isImageCell(cell)) return;
          const parsed = parseDataUrl(cell.data);
          if (!parsed) return; // 잘못된 data URL → 무시
          const ext = parsed.ext;
          const mediaIdx = mediaFiles.length + 1;
          const mediaName = `xl/media/image${mediaIdx}.${ext}`;
          mediaFiles.push({ name: mediaName, data: parsed.bytes });
          mediaExts.add(ext);
          const relId = `rId${mediaIdx}`; // openpyxl 호환 (rIdImgN → rIdN)
          const w = cell.w || 90;
          const h = cell.h || 90;
          // 같은 행에 이미지가 여러 개 있어도 가장 큰 h 기준으로 행 높이 결정
          const wantHt = pxToRowPoints(h);
          if (!imageRowMap[rIdx] || imageRowMap[rIdx] < wantHt) {
            imageRowMap[rIdx] = wantHt;
          }
          anchors.push({
            col: cIdx,
            row: rIdx,
            w,
            h,
            relId,
            picId: mediaIdx   // 1부터 시작 (openpyxl 표준)
          });
          rels.push({ relId, target: `../media/image${mediaIdx}.${ext}` });
        });
      });

      if (anchors.length > 0) {
        sheetImages.push({
          sheetIdx: sIdx,
          drawingXml: buildDrawingXml(anchors),
          drawingRels: buildDrawingRels(rels),
          imageRowMap
        });
      }
    });

    /* ---- 2) [Content_Types].xml ---- */
    let ct = XML_HEAD
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>';
    mediaExts.forEach(ext => {
      let mime = 'image/' + ext;
      if (ext === 'jpg') mime = 'image/jpeg';
      ct += `<Default Extension="${ext}" ContentType="${mime}"/>`;
    });
    ct += '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    safeSheets.forEach((_, i) => {
      ct += `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
    });
    sheetImages.forEach(si => {
      ct += `<Override PartName="/xl/drawings/drawing${si.sheetIdx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`;
    });
    ct += '</Types>';
    files.push({ name: '[Content_Types].xml', data: enc.encode(ct) });

    /* ---- 3) _rels/.rels ---- */
    files.push({
      name: '_rels/.rels',
      data: enc.encode(XML_HEAD
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        + '</Relationships>')
    });

    /* ---- 4) xl/workbook.xml + xl/_rels/workbook.xml.rels ---- */
    let wb = XML_HEAD
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
      + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<sheets>';
    let rels = XML_HEAD
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    safeSheets.forEach((s, i) => {
      wb += `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`;
      rels += `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`;
    });
    wb += '</sheets></workbook>';
    rels += `<Relationship Id="rId${safeSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    files.push({ name: 'xl/workbook.xml', data: enc.encode(wb) });
    files.push({ name: 'xl/_rels/workbook.xml.rels', data: enc.encode(rels) });

    /* ---- 5) xl/styles.xml ---- */
    files.push({
      name: 'xl/styles.xml',
      data: enc.encode(XML_HEAD
        + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        + '<fonts count="2">'
        + '<font><sz val="11"/><name val="맑은 고딕"/></font>'
        + '<font><b/><sz val="11"/><name val="맑은 고딕"/></font>'
        + '</fonts>'
        + '<fills count="2">'
        + '<fill><patternFill patternType="none"/></fill>'
        + '<fill><patternFill patternType="gray125"/></fill>'
        + '</fills>'
        + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
        + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        + '<cellXfs count="2">'
        + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
        + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
        + '</cellXfs>'
        + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
        + '</styleSheet>')
    });

    /* ---- 6) drawings + sheet rels ---- */
    // 시트 → drawing 관계 매핑
    const drawingForSheet = {}; // sheetIdx(0-based) -> { relId, drawingXml, drawingRels, imageRowMap }
    sheetImages.forEach(si => {
      const relId = `rIdDraw${si.sheetIdx + 1}`;
      drawingForSheet[si.sheetIdx] = {
        relId,
        drawingXml: si.drawingXml,
        drawingRels: si.drawingRels,
        imageRowMap: si.imageRowMap || {}
      };
    });

    /* ---- 7) worksheets + sheet rels ---- */
    safeSheets.forEach((sheet, i) => {
      const drawing = drawingForSheet[i];
      const imageRowMap = drawing ? drawing.imageRowMap : {};
      files.push({
        name: `xl/worksheets/sheet${i + 1}.xml`,
        data: enc.encode(sheetXml(sheet, drawing ? { relId: drawing.relId } : null, imageRowMap))
      });

      // sheet rels: drawing이 있으면 추가
      if (drawing) {
        files.push({
          name: `xl/worksheets/_rels/sheet${i + 1}.xml.rels`,
          data: enc.encode(XML_HEAD
            + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + `<Relationship Id="${drawing.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${i + 1}.xml"/>`
            + '</Relationships>')
        });
        files.push({
          name: `xl/drawings/drawing${i + 1}.xml`,
          data: enc.encode(drawing.drawingXml)
        });
        files.push({
          name: `xl/drawings/_rels/drawing${i + 1}.xml.rels`,
          data: enc.encode(drawing.drawingRels)
        });
      }
    });

    /* ---- 8) media (이미지 파일들) ---- */
    mediaFiles.forEach(m => {
      files.push({ name: m.name, data: m.data });
    });

    return makeZip(files);
  }

  return { buildXlsx };
})();