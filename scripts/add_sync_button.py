#!/usr/bin/env python3
"""Add cloud sync button to marketplace HTML pages."""
import os

PAGES = ['always', 'coupang', 'domagguk', 'elevenst', 'esm', 'nshipping',
         'ownerclan', 'rocketgrowth', 'smartstore', 'tossshopping']

BASE = r'C:\Users\DS-NEW-DESKTOP1\Desktop\ProductsList_Webapp'

NEEDLE = '    <button id="btn-clear" title="전체 삭제">전체삭제</button>\n  </div>'
REPLACE = ('    <button id="btn-clear" title="전체 삭제">전체삭제</button>\n'
            '    <button class="btn btn-cloud-sync" id="btn-cloud-sync" title="수동 동기화">☁️</button>\n'
            '  </div>')

for p in PAGES:
    path = os.path.join(BASE, f'{p}.html')
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'btn-cloud-sync' in content:
        print(f'SKIP: {p}.html (already has button)')
        continue
    if NEEDLE not in content:
        print(f'MISS: {p}.html (needle not found)')
        continue
    new_content = content.replace(NEEDLE, REPLACE)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'OK: {p}.html')