if (typeof Navbar !== 'undefined') { Navbar.init({ validate: true }); }
        if (typeof TurnstileHelper !== 'undefined') { TurnstileHelper.init(); }
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
        })();
