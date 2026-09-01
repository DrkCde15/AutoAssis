function showSuccess(msg) {
    let el = document.getElementById('aa-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'aa-toast';
      el.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2000;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--accent-ring);border-left:3px solid var(--accent);padding:12px 16px;border-radius:12px;box-shadow:var(--shadow-lg);font-size:14px;max-width:320px;opacity:0;transform:translateY(8px);transition:opacity .2s,transform .2s;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(function () { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; }, 3200);
}
