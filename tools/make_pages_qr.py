"""Generate the installation QR locally, only for a verified live Pages site."""
import argparse
import html
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
LOCAL_DEPS = ROOT / '.tools' / 'deps'
if LOCAL_DEPS.is_dir():
    sys.path.insert(0, str(LOCAL_DEPS))

def create(site_url):
    u = urlsplit(site_url)
    if u.scheme != 'https' or not u.hostname or not u.hostname.endswith('.github.io') or u.username or u.password or u.port or u.path != '/ration-gina-usya/':
        raise SystemExit('Use the actual HTTPS GitHub Pages URL ending /ration-gina-usya/.')
    base = urlunsplit(('https', u.hostname, u.path, '', ''))
    for asset in ['', 'manifest.webmanifest', 'sw.js', 'version.js', 'icons/icon-192.png', 'icons/icon-512.png']:
        with urllib.request.urlopen(base + asset, timeout=30) as response:
            if response.status != 200 or not response.read(100):
                raise SystemExit('The site is not ready: ' + asset)
    import qrcode
    from qrcode.constants import ERROR_CORRECT_M
    link = base + '?install=1#shopping'
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=12, border=4)
    qr.add_data(link)
    qr.make(fit=True)
    qr.make_image(fill_color='black', back_color='white').save(ROOT / 'QR_установка_iPhone.png')
    (ROOT / 'Ссылка_для_iPhone.txt').write_text(link + '\n', 'utf-8')
    safe = html.escape(link, quote=True)
    page = '''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Установка рациона на iPhone</title><style>body{font:18px/1.5 system-ui;max-width:640px;margin:40px auto;padding:20px}img{display:block;max-width:100%;width:360px;margin:auto}a{overflow-wrap:anywhere}li{margin:16px 0}@media print{body{margin:0}}</style><h1>Рацион Джины и Уси</h1><img src="./QR_установка_iPhone.png" alt="QR-код установки"><p><a href="LINK">Открыть приложение</a><br>LINK</p><ol><li>Отсканируйте QR и откройте ссылку в Safari на iPhone.</li><li>Нажмите «Поделиться» → «На экран „Домой“».</li><li>Нажмите «Добавить». Если есть переключатель «Открывать как веб-приложение», включите его.</li></ol><p>Вход в аккаунт не нужен. Первый запуск — с интернетом, затем приложение работает офлайн.</p><h2>Перенос прежних данных</h2><p>В старом приложении: Настройки → Экспорт JSON → сохранить в «Файлы». В новом: Настройки → Импорт JSON → выбрать сохранённый файл. Проверьте порции и рецепты, затем удалите прежнюю иконку. Если сохранять нечего, прежнюю иконку можно удалить сразу.</p></html>'''.replace('LINK', safe)
    (ROOT / 'Установка_на_iPhone.html').write_text(page, 'utf-8')
    print('Created local QR for ' + link)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('site_url')
    create(parser.parse_args().site_url)
