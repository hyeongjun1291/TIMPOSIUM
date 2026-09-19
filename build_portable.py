"""Build a self-contained HTML (code only; model weights download on demand)."""
import hashlib
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def build():
    html = (ROOT / 'dist/index.html').read_text()
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + (ROOT / 'dist/style.css').read_text() + '</style>')
    def script(match):
        content = (ROOT / 'dist' / match[1]).read_text().replace('</script', '<\\/script')
        return '<script>' + content + '</script>'
    # Defer scripts must execute after the body when inlined.
    matches = list(re.finditer(r'<script src="([^"]+)" defer></script>', html))
    scripts = '\n'.join(script(m) for m in matches)
    html = re.sub(r'<script src="([^"]+)" defer></script>', '', html)
    html = html.replace('</body>', scripts + '\n</body>')
    target = ROOT / 'Context-Lab.html'
    target.write_text(html)
    files = [target, ROOT / 'README.md', ROOT / 'server.py', ROOT / 'start-mac.command', ROOT / 'start-windows.bat', ROOT / 'THIRD_PARTY_NOTICES.md']
    files += sorted((ROOT / 'research').glob('*')) + sorted((ROOT / 'evaluation').glob('*'))
    files += list((ROOT / 'dist/vendor').glob('LICENSE*'))
    files = [p for p in files if p.is_file()]
    manifest = {str(p.relative_to(ROOT)): {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size} for p in files}
    (ROOT / 'PACKAGE_MANIFEST.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    files.append(ROOT / 'PACKAGE_MANIFEST.json')
    with zipfile.ZipFile(ROOT / 'Context-Lab-v2.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for p in files:
            z.write(p, 'Context-Lab-v2/' + str(p.relative_to(ROOT)))
    print(json.dumps({'html_bytes': target.stat().st_size, 'zip_bytes': (ROOT / 'Context-Lab-v2.zip').stat().st_size, 'files': len(files)}))


if __name__ == '__main__':
    build()
