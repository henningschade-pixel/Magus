#!/usr/bin/env python3
"""Einmalige Migration: lagert alle data:-URIs und Cursor-Base64 aus index.html in assets/ aus
und ersetzt sie durch relative Pfade. Idempotent (zweiter Lauf findet nichts mehr)."""
import re, base64, hashlib, os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
s = open('index.html', encoding='utf-8').read()
for d in ('img', 'audio', 'cursor'): os.makedirs('assets/' + d, exist_ok=True)
EXT = {'image/webp': 'webp', 'image/png': 'png', 'audio/mpeg': 'mp3'}
DIR = {'webp': 'img', 'png': 'img', 'mp3': 'audio'}
written = {}   # Pfad -> Bytes
def save(path, data):
    written[path] = data
    open(path, 'wb').write(data)
# 1) benannte Objekte: IMG={"k": "data:..."}, IMG.k="data:...", window.SND={...}
def named(m):
    key, mime, b64 = m.group(1), m.group(2), m.group(3)
    ext = EXT[mime]; path = 'assets/%s/%s.%s' % (DIR[ext], key, ext)
    save(path, base64.b64decode(b64)); return m.group(0).split('"')[0] + '"' + path + '"'
s = re.sub(r'(?<=[{,\s])"([A-Za-z0-9_]+)": "data:([a-z/]+);base64,([A-Za-z0-9+/=]+)"', lambda m: '"%s": "%s"' % (m.group(1), (lambda ext: (save('assets/%s/%s.%s' % (DIR[ext], m.group(1), ext), base64.b64decode(m.group(3))), 'assets/%s/%s.%s' % (DIR[ext], m.group(1), ext))[1])(EXT[m.group(2)])), s)
s = re.sub(r'IMG\.([a-z]+)="data:([a-z/]+);base64,([A-Za-z0-9+/=]+)"', lambda m: 'IMG.%s="%s"' % (m.group(1), (lambda ext, k: (save('assets/img/%s.%s' % (k, ext), base64.b64decode(m.group(3))), 'assets/img/%s.%s' % (k, ext))[1])(EXT[m.group(2)], m.group(1))), s)
# 2) CSS-url("data:...") und <img src="data:...">: Duplikate (gleicher Hash) teilen sich eine Datei
seen = {}
def anon(m):
    mime, b64 = m.group(2), m.group(3); data = base64.b64decode(b64); h = hashlib.md5(data).hexdigest()
    if h in seen: return m.group(1) + seen[h] + m.group(4)
    ext = EXT[mime]
    for cand in ('assets/stein.webp', 'assets/runen-maske.webp'):
        if os.path.exists(cand) and open(cand, 'rb').read() == data: seen[h] = cand; return m.group(1) + cand + m.group(4)
    name = 'assets/img/bg-%s.%s' % (h[:8], ext); save(name, data); seen[h] = name; return m.group(1) + name + m.group(4)
s = re.sub(r'(url\("|src=")data:([a-z/]+);base64,([A-Za-z0-9+/=]+)("\)|")', anon, s)
# 3) Cursor: ['<base64>', x, y]
def cur(m):
    who, state = m.group(1), m.group(2); path = 'assets/cursor/%s-%s.png' % (who, state)
    save(path, base64.b64decode(m.group(3))); return "%s: ['%s'" % (state, path)
i = s.find('const CURSORS = {'); j = s.find('};', i) + 2
blk = s[i:j]; cur_state = {}
out = []; who = None
for line in blk.split('\n'):
    mm = re.match(r'\s*(human|monster):', line)
    if mm: who = mm.group(1)
    line = re.sub(r"(normal|pressed): \['([A-Za-z0-9+/=]+)'", lambda m: cur_for(who, m) if False else "%s: ['%s'" % (m.group(1), (lambda p: (save(p, base64.b64decode(m.group(2))), p)[1])('assets/cursor/%s-%s.png' % (who, m.group(1)))), line)
    out.append(line)
s = s[:i] + '\n'.join(out) + s[j:]
open('index.html', 'w', encoding='utf-8').write(s)
for p, d in sorted(written.items()): print('%-40s %7d B' % (p, len(d)))
print('index.html:', len(s), 'Zeichen; verbleibende data:-URIs:', len(re.findall('data:(image|audio)', s)))
