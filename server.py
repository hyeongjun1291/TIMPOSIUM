"""Serve the UI and proxy only the local Ollama server. No external API calls."""
import json
import argparse
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError

ROOT = Path(__file__).parent / 'dist'


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def reply(self, status, data):
        payload = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def proxy(self, path, body=None):
        try:
            req = Request('http://127.0.0.1:11434' + path, data=body,
                          headers={'Content-Type': 'application/json'})
            with urlopen(req, timeout=220) as response:
                self.reply(200, json.load(response))
        except (URLError, TimeoutError, ValueError):
            self.reply(503, {'error': '로컬 Ollama 서버 또는 모델을 확인해 주세요.'})

    def do_GET(self):
        if self.path == '/api/models':
            return self.proxy('/api/tags')
        if self.path.startswith('/api/'):
            return self.reply(404, {'error': 'Unknown route'})
        if self.path in {'/', '/index.html'} and (Path(__file__).parent / 'Context-Lab.html').is_file():
            payload = (Path(__file__).parent / 'Context-Lab.html').read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        if self.path not in {'/', '/index.html', '/style.css', '/app.js', '/core.js', '/runtime.js', '/examples.js', '/vendor/webllm-0.2.85.js'}:
            return self.reply(404, {'error': 'Unknown route'})
        super().do_GET()

    def do_POST(self):
        if self.path != '/api/chat':
            return self.reply(404, {'error': 'Unknown route'})
        origin = self.headers.get('Origin')
        allowed = {'http://127.0.0.1:8765', 'http://localhost:8765'}
        if origin and origin not in allowed:
            return self.reply(403, {'error': 'Origin rejected'})
        if self.headers.get('Host') not in {'127.0.0.1:8765', 'localhost:8765'}:
            return self.reply(403, {'error': 'Host rejected'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 200000:
                raise ValueError()
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict) or not isinstance(data.get('model'), str) or not data['model'].strip():
                raise ValueError()
            messages = data.get('messages')
            if not isinstance(messages, list) or not messages or any(not isinstance(m, dict) or m.get('role') not in {'system', 'user', 'assistant'} or not isinstance(m.get('content'), str) for m in messages):
                raise ValueError()
            payload = {'model': data['model'], 'messages': messages, 'stream': False}
            if data.get('format') == 'json' or isinstance(data.get('format'), dict):
                payload['format'] = data['format']
            if isinstance(data.get('options'), dict):
                payload['options'] = {k: data['options'][k] for k in ('temperature', 'seed', 'num_predict') if k in data['options']}
        except (ValueError, TypeError):
            return self.reply(400, {'error': 'Invalid request'})
        self.proxy('/api/chat', json.dumps(payload).encode())


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--open', action='store_true')
    args = parser.parse_args()
    try:
        server = ThreadingHTTPServer(('127.0.0.1', 8765), Handler)
    except OSError as exc:
        raise SystemExit('Port 8765 is unavailable. Stop the existing server and retry: ' + str(exc))
    print('Context Lab: http://127.0.0.1:8765', flush=True)
    if args.open:
        threading.Timer(0.5, lambda: webbrowser.open('http://127.0.0.1:8765')).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
