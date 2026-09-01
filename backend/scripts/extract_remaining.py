#!/usr/bin/env python3
"""
Extract remaining inline scripts from HTML files to external .js files.
Processes blocks from last to first to avoid index shifting.
"""
import re
import hashlib
import base64
from pathlib import Path

FRONTEND = Path("/home/julio_cesar/Projetos/AGENTS/AutoAssist/frontend/public")
JS_DIR = FRONTEND / "static" / "js"

def compute_sha256(content: str) -> str:
    h = hashlib.sha256(content.encode('utf-8')).digest()
    return "sha256-" + base64.b64encode(h).decode()

def get_inline_blocks(content: str):
    """Return list of (full_match, tag_start, script_content, start, end) for inline scripts."""
    pattern = re.compile(
        r'(<script(?:\s+type="[^"]*")?\s*>)\s*\n?(.*?)\n?\s*(</script>)',
        re.DOTALL
    )
    blocks = []
    for m in pattern.finditer(content):
        if 'src=' in m.group(1):
            continue
        blocks.append({
            'full': m.group(0),
            'tag': m.group(1),
            'code': m.group(2).strip(),
            'start': m.start(),
            'end': m.end(),
        })
    return blocks

def extract_file(html_file: str, extractions: list):
    """
    extractions: list of (block_index, js_filename) — block_index is 0-based among inline blocks.
    Processes in reverse order so indices stay valid.
    """
    html_path = FRONTEND / html_file
    if not html_path.exists():
        print(f"SKIP: {html_file} not found")
        return []

    content = html_path.read_text(encoding='utf-8')
    blocks = get_inline_blocks(content)
    hashes = []

    print(f"\n{'='*50}")
    print(f"{html_file}: {len(blocks)} inline block(s)")

    # Sort extractions by block index descending
    for block_idx, js_filename in sorted(extractions, key=lambda x: x[0], reverse=True):
        if block_idx >= len(blocks):
            print(f"  SKIP {js_filename}: block {block_idx} out of range")
            continue

        m = blocks[block_idx]
        script_content = m['code']

        # Write external JS
        js_path = JS_DIR / js_filename
        js_path.write_text(script_content + '\n', encoding='utf-8')
        h = compute_sha256(script_content)
        hashes.append((js_filename, h))
        print(f"  [{block_idx}] -> {js_filename} ({len(script_content)} chars)")

        # Replace in HTML
        replacement = f'<script src="static/js/{js_filename}"></script>'
        content = content.replace(m['full'], replacement, 1)

        # Re-parse to update block positions (since we replaced text)
        blocks = get_inline_blocks(content)

    html_path.write_text(content, encoding='utf-8')
    return hashes

# ── Define extractions per file ──────────────────────────────
# (html_file, [(block_index, js_filename), ...])
all_hashes = []

simple_files = [
    ("cadastro.html", [(0, "cadastro.js")]),
    ("esqueci-senha.html", [(0, "esqueci-senha.js")]),
    ("redefinir-senha.html", [(0, "redefinir-senha.js")]),
    ("verificacao.html", [(0, "verificacao.js")]),
    ("feedback.html", [(0, "feedback.js")]),
    ("pagamento-sucesso.html", [(0, "pagamento-sucesso.js")]),
    ("planos.html", [(0, "planos.js")]),
    ("docs.html", [(0, "docs.js")]),
    ("library.html", [(0, "library.js")]),
    ("eventos.html", [(0, "eventos.js")]),
    ("perfil.html", [(0, "perfil.js"), (2, "perfil-toast.js")]),
    ("maintenance_history.html", [(0, "maintenance-history.js")]),
    ("login.html", [(0, "login.js")]),
]

multi_block_files = [
    ("b2b.html", [(0, "b2b.js"), (1, "b2b-plans.js")]),
    ("dashboard.html", [(0, "dashboard.js"), (1, "dashboard-modals.js"), (2, "dashboard-details.js")]),
    ("maps.html", [(0, "maps-auth.js"), (1, "maps-main.js")]),
    ("chat.html", [(0, "chat-main.js"), (1, "chat-autoscroll.js")]),
    ("index.html", [(0, "index-schema-org.js"), (1, "index-schema-service.js"), (2, "index-waitlist.js"), (3, "index-main.js"), (4, "index-sw.js")]),
]

for html_file, extractions in simple_files + multi_block_files:
    h = extract_file(html_file, extractions)
    all_hashes.extend(h)

print("\n\n=== ALL CSP HASHES ===")
for name, h in sorted(all_hashes):
    print(f"  '{h}',  // {name}")
