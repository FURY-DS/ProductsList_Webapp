#!/usr/bin/env python3
"""Bump cache version in all HTML files and JS files."""
import os
import re

BASE = r'C:\Users\DS-NEW-DESKTOP1\Desktop\ProductsList_Webapp'

# Current version
OLD_JS = '?v=34'
OLD_CSS = '?v=34'
OLD_FAVICON = '?v=36'

NEW_JS = '?v=37'
NEW_CSS = '?v=37'
NEW_FAVICON = '?v=37'

# HTML files
for f in os.listdir(BASE):
    if not f.endswith('.html'):
        continue
    path = os.path.join(BASE, f)
    with open(path, 'r', encoding='utf-8') as fp:
        content = fp.read()
    orig = content
    content = content.replace(f'src="js/{OLD_JS[1:]}"', f'src="js/{NEW_JS[1:]}"')  # not used
    # More precise: js/*.js?v=34 → js/*.js?v=37
    content = re.sub(r'(js/[\w\-]+\.js)\?v=34', r'\1?v=37', content)
    content = re.sub(r'(css/[\w\-]+\.css)\?v=34', r'\1?v=37', content)
    content = re.sub(r'(favicon[.\-\w]*)\?v=36', r'\1?v=37', content)
    content = re.sub(r'(apple-touch-icon\.png)\?v=36', r'\1?v=37', content)
    if content != orig:
        with open(path, 'w', encoding='utf-8') as fp:
            fp.write(content)
        print(f'OK: {f}')

# Sanity check - verify nothing references v=34 or v=36
for f in os.listdir(BASE):
    if not f.endswith('.html'):
        continue
    path = os.path.join(BASE, f)
    with open(path, 'r', encoding='utf-8') as fp:
        content = fp.read()
    if 'v=34' in content or 'v=36' in content:
        print(f'WARN: {f} still has old version')