"""Packar webbläsartillägget i extension/ till public/hela-laget-svenskalag.zip.
Kör efter ändringar i tillägget: python3 scripts/zip-extension.py"""
import pathlib, zipfile
root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'extension'
out = root / 'public' / 'hela-laget-svenskalag.zip'
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(src.iterdir()):
        if f.is_file() and f.name != 'README.md':
            z.write(f, f'hela-laget-svenskalag/{f.name}')
print('skrev', out)
