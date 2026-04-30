#!/usr/bin/env python3
"""
HTTP server for the Lockslip band website with auto-reload
Run with: python3 server.py
"""
import http.server
import socketserver
import os
import sys
import threading
import time
from pathlib import Path

PORT = 8000
WATCH_DIRS = ['.', 'js', 'styles', 'content', 'assets']
WATCH_EXTENSIONS = {'.js', '.css', '.json', '.html', '.md'}

class ReuseAddrTCPServer(socketserver.ThreadingTCPServer):
    """Allow immediate server restart by reusing the port, threaded for concurrent requests"""
    allow_reuse_address = True
    daemon_threads = True

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def log_message(self, format, *args):
        short_path = self.path.split('?')[0]
        if len(args) >= 2:
            status = args[1]
            range_header = self.headers.get('Range', '') if hasattr(self, 'headers') else ''
            size_info = ''
            try:
                path = self.translate_path(self.path)
                if os.path.isfile(path):
                    size_mb = os.path.getsize(path) / 1024 / 1024
                    if size_mb > 0.1:
                        size_info = f' ({size_mb:.1f}MB)'
            except Exception:
                pass
            range_info = f' Range:{range_header}' if range_header else ''
            print(f"  {status} {short_path}{size_info}{range_info}")
        else:
            print(f"  {format % args}")

    def do_GET(self):
        range_header = self.headers.get('Range')
        if not range_header:
            return super().do_GET()

        path = self.translate_path(self.path)
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404)
            return

        with f:
            file_size = os.path.getsize(path)
            range_spec = range_header.replace('bytes=', '')
            start_str, end_str = range_spec.split('-', 1)
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str else file_size - 1
            end = min(end, file_size - 1)
            length = end - start + 1

            self.send_response(206)
            ctype = self.guess_type(path)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
            self.send_header('Content-Length', str(length))
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()

            f.seek(start)
            try:
                self.wfile.write(f.read(length))
            except (ConnectionResetError, BrokenPipeError):
                pass

class FileWatcher:
    """Watch for file changes and store modification times"""
    def __init__(self):
        self.files = {}
        self.changed = False
        self.last_notification = 0
        self.scan_interval = 1.0

    def initial_scan(self):
        """Store initial file modification times"""
        for ext_dir in WATCH_DIRS:
            if os.path.isdir(ext_dir):
                for root, dirs, files in os.walk(ext_dir):
                    # Skip node_modules and venv directories
                    dirs[:] = [d for d in dirs if d not in ['node_modules', 'venv', '.git', '__pycache__', 'image_optimizer_env']]
                    for file in files:
                        if any(file.endswith(ext) for ext in WATCH_EXTENSIONS):
                            path = os.path.join(root, file)
                            try:
                                self.files[path] = os.path.getmtime(path)
                            except OSError:
                                pass

    def check(self):
        """Check for any file changes"""
        for ext_dir in WATCH_DIRS:
            if os.path.isdir(ext_dir):
                for root, dirs, files in os.walk(ext_dir):
                    dirs[:] = [d for d in dirs if d not in ['node_modules', 'venv', '.git', '__pycache__', 'image_optimizer_env']]
                    for file in files:
                        if any(file.endswith(ext) for ext in WATCH_EXTENSIONS):
                            path = os.path.join(root, file)
                            try:
                                mtime = os.path.getmtime(path)
                                if path not in self.files or self.files[path] != mtime:
                                    self.files[path] = mtime
                                    return True, path
                            except OSError:
                                pass

        # Check for deleted files
        paths_to_remove = [p for p in self.files if not os.path.exists(p)]
        if paths_to_remove:
            for p in paths_to_remove:
                del self.files[p]
            return True, f"Deleted: {paths_to_remove[0]}"

        return False, None

def watch_files(watcher):
    """Background thread to monitor file changes"""
    print("👀 File watcher started")
    while True:
        time.sleep(watcher.scan_interval)
        changed, path = watcher.check()
        if changed:
            now = time.time()
            # Only notify if it's been more than 0.5 seconds since last notification
            if now - watcher.last_notification > 0.5:
                watcher.last_notification = now
                print(f"\n📝 Changes detected: {path}")
                print(f"🔄 Refresh your browser to see the updates")

def main():
    # Change to the directory containing this script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    watcher = FileWatcher()
    watcher.initial_scan()

    # Start file watcher thread
    watcher_thread = threading.Thread(target=watch_files, args=(watcher,), daemon=True)
    watcher_thread.start()

    try:
        with ReuseAddrTCPServer(("", PORT), CustomHandler) as httpd:
            print(f"🎸 Lockslip website server running at:")
            print(f"   http://localhost:{PORT}")
            print(f"   http://127.0.0.1:{PORT}")
            print(f"")
            print(f"📁 Serving from: {os.getcwd()}")
            print(f"✅ Auto-reload enabled for: {', '.join(WATCH_EXTENSIONS)}")
            print(f"")
            print(f"Press Ctrl+C to stop the server")
            print(f"=" * 50)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print(f"\n🛑 Server stopped")
        sys.exit(0)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Port {PORT} is already in use")
            print(f"Try: python3 server.py")
            sys.exit(1)
        else:
            raise

if __name__ == "__main__":
    main()