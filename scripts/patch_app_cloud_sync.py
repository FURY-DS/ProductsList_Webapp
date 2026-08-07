#!/usr/bin/env python3
"""Inject cloud sync init code into all 10 marketplace app.js files."""
import os
import re

# Mapping: page -> (function prefix uppercase, CONFIG name, render function name, newCard function name)
PAGES = {
    'always':     ('ALWAYS',     'ALWAYS_CONFIG',     'renderALWAYS',     'newALWAYSCard'),
    'coupang':    ('COUPANG',    'COUPANG_CONFIG',    'renderCoupang',    'newCoupangCard'),
    'domagguk':   ('DOMAGGUK',   'DOMAGGUK_CONFIG',   'renderDOMAGGUK',   'newDOMAGGUKCard'),
    'elevenst':   ('ELEVENST',   'ELEVENST_CONFIG',   'renderElevenst',   'newElevenstCard'),
    'esm':        ('ESM',        'ESM_CONFIG',        'renderEsm',        'newEsmCard'),
    'nshipping':  ('NSHIPPING',  'NSHIPPING_CONFIG',  'renderNshipping',  'newNshippingCard'),
    'ownerclan':  ('OWNERCLAN',  'OWNERCLAN_CONFIG',  'renderOWNERCLAN',  'newOWNERCLANCard'),
    'rocketgrowth':('ROCKETGROWTH','ROCKETGROWTH_CONFIG','renderRocketgrowth','newRocketgrowthCard'),
    'smartstore': ('SMARTSTORE', 'SMARTSTORE_CONFIG', 'renderSmartstore', 'newSmartstoreCard'),
    'tossshopping':('TOSSSHOPPING','TOSSSHOPPING_CONFIG','renderTOSSSHOPPING','newTOSSSHOPPINGCard'),
}

BASE = r'C:\Users\DS-NEW-DESKTOP1\Desktop\ProductsList_Webapp\js'

# Marker indicating already patched
PATCH_MARKER = '// === cloud-sync-init ==='

for page, (prefix, cfg_name, render_fn, new_card_fn) in PAGES.items():
    path = os.path.join(BASE, f'{page}-app.js')
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    if PATCH_MARKER in content:
        print(f'SKIP: {page}-app.js (already patched)')
        continue

    # 1. Patch the clearStalePageDataIfServerEmpty call to add pageKey
    old_clear = f"await clearStalePageDataIfServerEmpty([{cfg_name}.STORAGE_KEY, {cfg_name}.PRODUCTLIST_STORAGE_KEY]);"
    new_clear = f"await clearStalePageDataIfServerEmpty([{cfg_name}.STORAGE_KEY, {cfg_name}.PRODUCTLIST_STORAGE_KEY], {cfg_name}.STORAGE_KEY);"
    if old_clear not in content:
        print(f'MISS: {page}-app.js (clearStale line not found)')
        continue
    content = content.replace(old_clear, new_clear)

    # 2. Insert cloud-sync init code after the `loadXxx();` line
    # We insert before the `reportSaveResult(saveXxx()...)` line
    load_line = f'load{prefix[0]}{prefix[1:].lower()}();'  # e.g. loadNshipping();
    # Actually the load function name differs. Let me find it.
    # Pattern: loadPageName() function call - we'll just find "loadXxx();"
    # Simpler: find the pattern after "loadXxx();\n\n  // 마켓노트"
    # We need to find a unique insertion point. Use a regex.

    # Insert cloud init code right before "// 마켓노트 최신 데이터로 최종원가 등 자동 연동 필드 재계산" if present, otherwise after loadXxx();
    # We'll use the line after loadXxx(); since pattern may differ

    # Find: loadXxx();\n  <next line>
    # Simpler approach: insert after loadXxx();
    # Use regex: (load\w+\(\);)\n(\n  // 마켓노트|  resolve|  render)
    pattern = re.compile(r'(load\w+\(\);)\n', re.MULTILINE)
    matches = list(pattern.finditer(content))
    if not matches:
        print(f'MISS: {page}-app.js (loadXxx line not found)')
        continue
    load_match = matches[0]

    cloud_init_block = (
        f'  {PATCH_MARKER}\n'
        f'  CloudSync.init({cfg_name}.STORAGE_KEY);\n'
        f'  await cloudPullAndRenderPage({cfg_name}, {page.replace("-", "")}State || state, {new_card_fn}, {render_fn});\n'
        f'  startPageAutoSync({cfg_name}, {page.replace("-", "")}State || state, {new_card_fn}, {render_fn}, 10000);\n'
        f'\n'
    )

    # Insert after loadXxx();
    insert_pos = load_match.end()
    content = content[:insert_pos] + '\n' + cloud_init_block + content[insert_pos:].lstrip('\n')

    # 3. Bind the sync button click handler - add inside bindXxxPageLifecycle or as separate binding
    # Add at end of bindXxxPageLifecycle function (before its closing brace)
    # Pattern: bindXxxPageLifecycle has "// 페이지를 벗어나기 전에" comment + addEventListener('beforeunload', ...)
    # We'll add right after the pageshow handler's closing brace

    btn_bind = (
        f'\n  // 수동 클라우드 동기화 버튼\n'
        f'  const btnCloudSync = document.getElementById(\'btn-cloud-sync\');\n'
        f'  if (btnCloudSync) {{\n'
        f'    btnCloudSync.addEventListener(\'click\', () => manualCloudSyncPage({cfg_name}, {page.replace("-", "")}State || state, {new_card_fn}, {render_fn}));\n'
        f'  }}\n'
    )

    # Insert before "// 페이지를 벗어나기 전에" comment which precedes beforeunload
    marker = '\n  // 페이지를 벗어나기 전에 혹시 모를 미저장 변경사항 저장'
    if marker in content:
        content = content.replace(marker, btn_bind + marker)
    else:
        # If the page doesn't have that comment (settlement-style), skip the button binding
        print(f'NOTE: {page}-app.js (beforeunload marker not found, skipping button bind)')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'OK: {page}-app.js')