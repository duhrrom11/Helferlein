#!/usr/bin/env python3
"""Syntax-check changed web files without network or production access."""
import sys
import subprocess
import tempfile
from pathlib import Path
from html.parser import HTMLParser

class InlineScripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.active = False
        self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag != "script":
            return
        a = dict(attrs)
        self.active = "src" not in a and a.get("type", "").lower() in ("", "text/javascript", "application/javascript", "module")
        self.parts = []
    def handle_data(self, data):
        if self.active:
            self.parts.append(data)
    def handle_endtag(self, tag):
        if tag == "script" and self.active:
            if "".join(self.parts).strip():
                self.scripts.append("".join(self.parts))
            self.active = False

def node_check(path):
    r = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
    if r.returncode:
        print(f"{path}: {r.stderr}", file=sys.stderr)
    return r.returncode == 0

def main(paths):
    ok = True
    count = 0
    with tempfile.TemporaryDirectory() as temp:
        for filename in paths:
            path = Path(filename)
            if not path.is_file():
                continue
            if path.suffix.lower() in (".js", ".mjs", ".cjs"):
                count += 1
                ok = node_check(path) and ok
            elif path.suffix.lower() == ".html":
                count += 1
                try:
                    html = path.read_text(encoding="utf-8")
                    parser = InlineScripts()
                    parser.feed(html)
                    parser.close()
                except (UnicodeError, ValueError) as exc:
                    print(f"{path}: {exc}", file=sys.stderr)
                    ok = False
                    continue
                if path.name == "index.html" and ("<title" not in html.lower() or "<meta charset" not in html.lower()):
                    print(f"{path}: missing title or charset", file=sys.stderr)
                    ok = False
                for i, code in enumerate(parser.scripts):
                    module = "type=\"module\"" in html and ("import " in code or "export " in code)
                    tmp = Path(temp) / f"inline-{count}-{i}{'.mjs' if module else '.js'}"
                    tmp.write_text(code, encoding="utf-8")
                    ok = node_check(tmp) and ok
    print(f"Checked {count} changed web files")
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
