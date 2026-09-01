/**
 * Navbar initialization + mobile toggle.
 * Shared across all pages — extracted from inline <script> blocks.
 */
if (typeof Navbar !== 'undefined') {
    Navbar.init({ validate: true });
}
(function () {
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('authLinks');
    if (toggle && links) {
        toggle.addEventListener('click', function () {
            var open = links.classList.toggle('nav-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        links.addEventListener('click', function (e) {
            if (e.target.closest('a')) {
                links.classList.remove('nav-open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
})();
