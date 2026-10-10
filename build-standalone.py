from pathlib import Path
import base64
root = Path(__file__).resolve().parent
html = (root/'index.html').read_text(encoding='utf-8')
css = (root/'css'/'styles.css').read_text(encoding='utf-8')
js = (root/'js'/'app.bundle.js').read_text(encoding='utf-8')
logo = (root/'assets'/'dp-world-logo.jpg').read_bytes()
logo_data = 'data:image/jpeg;base64,' + base64.b64encode(logo).decode('ascii')
html = html.replace('<link rel="icon" href="assets/dp-world-logo.jpg" />', f'<link rel="icon" href="{logo_data}" />')
html = html.replace('<link rel="stylesheet" href="css/styles.css" />', '<style>\n' + css + '\n</style>')
html = html.replace('src="assets/dp-world-logo.jpg"', f'src="{logo_data}"')
html = html.replace('<script src="js/app.bundle.js"></script>', '<script>\n' + js + '\n</script>')
(root/'standalone.html').write_text(html, encoding='utf-8')
print('Wrote standalone.html')
