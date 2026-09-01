#!/usr/bin/env python3
"""
Script to extract inline <script> blocks from HTML files to external .js files.
Replaces inline blocks with <script src="..."> references.

Usage: python3 extract_inline_scripts.py <html_file>
"""
import re
import sys
import hashlib
from pathlib import Path

def compute_sha256(content: str) -> str:
    """Compute SHA-256 hash for CSP."""
    import base64
    h = hashlib.sha256(content.encode('utf-8')).digest()
    return "sha256-" + base64.b64encode(h).decode()

def extract_scripts(html_path: str):
    path = Path(html_path)
    if not path.exists():
        print(f"File not found: {html_path}")
        return

    content = path.read_text(encoding='utf-8')
    page_name = path.stem  # e.g., "index"

    # Pattern to match inline <script> blocks (not <script src=...>)
    # We need to match <script>...</script> but NOT <script src="...">...</script>
    pattern = re.compile(
        r'(<script(?:\s+type="[^"]*")?\s*>)\s*\n?(.*?)\n?\s*(</script>)',
        re.DOTALL
    )

    matches = list(pattern.finditer(content))
    if not matches:
        print(f"No inline scripts found in {html_path}")
        return

    # Filter out scripts that have src attribute (they shouldn't match but just in case)
    inline_matches = []
    for m in matches:
        tag_start = m.group(1)
        if 'src=' in tag_start:
            continue
        inline_matches.append(m)

    if not inline_matches:
        print(f"No inline scripts found in {html_path}")
        return

    print(f"\n{'='*60}")
    print(f"File: {html_path}")
    print(f"Found {len(inline_matches)} inline script block(s)")
    print(f"{'='*60}")

    # Check if this is the navbar init script (common across many files)
    navbar_init = """if (typeof Navbar !== 'undefined') { Navbar.init({ validate: true }); }
(function () {
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('authLinks');
    if (toggle && links) {
        toggle.addEventListener('click', function () {
            var open = links.classList.toggle('nav-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        links.addEventListener('click', function (e) {
            if (e.target.closest('a')) { links.classList.remove('nav-open'); toggle.setAttribute('aria-expanded', 'false'); }
        });
    }
})();"""

    # Check for service worker registration
    sw_simple = "if('serviceWorker'in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}"

    new_content = content
    extracted = 0

    for i, m in enumerate(inline_matches):
        script_content = m.group(2).strip()
        full_match = m.group(0)

        # Skip if it's the navbar init (already extracted to navbar-init.js)
        if script_content.replace('\n', '').replace(' ', '') == navbar_init.replace('\n', '').replace(' ', ''):
            print(f"  Block {i+1}: NAVBAR INIT -> replacing with navbar-init.js reference")
            replacement = '<script src="static/js/navbar-init.js"></script>'
            new_content = new_content.replace(full_match, replacement, 1)
            extracted += 1
            continue

        # Skip if it's the simple service worker registration
        if script_content.replace('\n', '').replace(' ', '') == sw_simple.replace('\n', '').replace(' ', ''):
            print(f"  Block {i+1}: SW REGISTER -> replacing with sw-register.js reference")
            replacement = '<script src="static/js/sw-register.js"></script>'
            new_content = new_content.replace(full_match, replacement, 1)
            extracted += 1
            continue

        # Compute hash for this script
        script_hash = compute_sha256(script_content)
        print(f"  Block {i+1}: {len(script_content)} chars, hash: {script_hash[:30]}...")
        print(f"    First 80 chars: {script_content[:80]}...")

    if extracted > 0:
        # Write updated HTML
        path.write_text(new_content, encoding='utf-8')
        print(f"\n  Updated {html_path}: replaced {extracted} block(s)")
    else:
        print(f"\n  No replacements made (scripts need manual extraction)")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 extract_inline_scripts.py <html_file> [html_file2 ...]")
        sys.exit(1)
    for f in sys.argv[1:]:
        extract_scripts(f)
