/* ============================================================
   AutoAssist - Animations (anime.js + Lenis)
   Arquivo único (antigos módulos ES fundidos para reduzir
   requests: 15 -> 1). Seções por feature. Depende dos globais
   `window.anime` (static/vendor/anime.min.js) e `window.Lenis`
   (static/vendor/lenis.min.js), carregados antes via <script>.
   Expõe `window.AAAnim` para os scripts inline chamarem sob
   demanda (hooks). Respeita prefers-reduced-motion globalmente.
   ============================================================ */
(function () {
  "use strict";

  /* ─── base ─────────────────────────────────────────────── */

  const REDUCED_MOTION =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function animeAvailable() {
    return typeof window !== "undefined" && typeof window.anime === "function";
  }

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  /* ─── hero (landing) ───────────────────────────────────── */
  // Timeline escalonada (navbar → mark → eyebrow → título →
  // subtítulo → botões → trust → mockup) com fade + translateY.
  // Apenas quando anime.js está disponível e sem reduced-motion.

  function initHero() {
    if (!animeAvailable() || REDUCED_MOTION) return;

    const hero = document.querySelector(".brand-hero");
    if (!hero) return;

    const items = [
      document.querySelector(".navbar"),
      hero.querySelector(".brand-hero__mark"),
      hero.querySelector(".brand-hero__eyebrow"),
      hero.querySelector("#brandHeroTitle"),
      hero.querySelector(".brand-hero__copy"),
      hero.querySelector(".brand-hero__actions"),
      hero.querySelector(".brand-hero__trust"),
    ].filter(Boolean);

    const scene = document.querySelector(".car-scroll__scene");
    const targets = items.length ? [...items, scene].filter(Boolean) : [];

    if (!targets.length) return;

    // Desativa a transição do navbar durante a timeline para evitar conflito.
    document.documentElement.classList.add("aa-hero-anim");

    anime.set(items, { opacity: 0, translateY: 14 });
    if (scene) anime.set(scene, { opacity: 0, scale: 0.985 });

    // Timeline enxuta: primeiro item em ~50ms, tudo concluído em ~1s.
    const tl = anime.timeline({ easing: "easeOutCubic" });
    tl.add({
      targets: items,
      opacity: 1,
      translateY: 0,
      duration: 450,
      delay: anime.stagger(70, { start: 50 }),
    });

    if (scene) {
      tl.add(
        {
          targets: scene,
          opacity: 1,
          scale: 1,
          duration: 650,
          easing: "easeOutQuart",
        },
        "-=360"
      );
    }
  }

  /* ─── reveal no scroll ─────────────────────────────────── */
  // Elementos entram com fade + translateY + pequena escala quando
  // entram no viewport (IntersectionObserver). Uma vez por conjunto.

  const observed = new WeakSet();

  function initReveal(selectors, opts = {}) {
    if (!animeAvailable() || REDUCED_MOTION) return;
    if (typeof IntersectionObserver === "undefined") return;

    const elements = Array.from(document.querySelectorAll(selectors)).filter(
      (el) => !observed.has(el)
    );
    if (!elements.length) return;

    const duration = opts.duration || 550;
    const stagger = opts.stagger || 70;

    // Esconde apenas os elementos ainda fora do viewport (evita flash).
    elements.forEach((el) => {
      anime.set(el, { opacity: 0, translateY: 26, scale: 0.98 });
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target;
          io.unobserve(target);
          observed.add(target);
          anime({
            targets: target,
            opacity: 1,
            translateY: 0,
            scale: 1,
            duration,
            easing: "easeOutCubic",
            delay: anime.stagger(stagger),
          });
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    elements.forEach((el) => io.observe(el));
  }

  // Anima imediatamente um conjunto já renderizado
  // (listas dinâmicas: histórico, resultados, cards via JS).
  function staggerIn(scope, selector, opts = {}) {
    if (!animeAvailable() || REDUCED_MOTION) return;
    const root = typeof scope === "string" ? document.querySelector(scope) : scope;
    if (!root) return;

    const elements = Array.from(root.querySelectorAll(selector)).filter(
      (el) => !observed.has(el)
    );
    if (!elements.length) return;

    elements.forEach((el) => observed.add(el));
    anime({
      targets: elements,
      opacity: [0, 1],
      translateY: [16, 0],
      duration: opts.duration || 450,
      easing: "easeOutCubic",
      delay: anime.stagger(opts.stagger || 60),
    });
  }

  /* ─── hover de cards ───────────────────────────────────── */
  // scale 1.02 via anime.js + sombra/brilho por classe CSS.
  // Discreto e curto (220ms).

  const hovered = new WeakSet();

  function initCards(selector) {
    if (!animeAvailable() || REDUCED_MOTION) return;

    document.querySelectorAll(selector).forEach((card) => {
      if (hovered.has(card)) return;
      hovered.add(card);
      card.classList.add("aa-card");

      card.addEventListener("mouseenter", () => {
        card.classList.add("aa-card--hover");
        anime({
          targets: card,
          scale: 1.02,
          translateY: -4,
          duration: 220,
          easing: "easeOutCubic",
        });
      });

      card.addEventListener("mouseleave", () => {
        card.classList.remove("aa-card--hover");
        anime({
          targets: card,
          scale: 1,
          translateY: 0,
          duration: 220,
          easing: "easeOutCubic",
        });
      });
    });
  }

  /* ─── contadores ───────────────────────────────────────── */
  // Elementos com [data-count] sobem de 0 até o valor alvo com
  // easing suave. Suporta formatação pt-BR via data-format="int".
  // Re-anima quando o atributo data-count muda.

  const counterState = new WeakMap();

  function formatValue(value, format) {
    return format === "int"
      ? Math.round(value).toLocaleString("pt-BR")
      : String(Math.round(value * 10) / 10);
  }

  function animateCounters(scope = null) {
    const canAnimate = animeAvailable() && !REDUCED_MOTION;
    const root = scope || document;

    root.querySelectorAll("[data-count]").forEach((el) => {
      const target = parseFloat(el.getAttribute("data-count") || "0");
      if (Number.isNaN(target)) return;

      const format = el.getAttribute("data-format");
      const previous = counterState.get(el);

      if (!canAnimate) {
        el.textContent = formatValue(target, format);
        return;
      }

      if (previous !== undefined && Math.abs(previous - target) < 1) {
        return;
      }

      counterState.set(el, target);
      const current = { value: previous ?? 0 };

      anime({
        targets: current,
        value: target,
        duration: 900,
        easing: "easeOutCubic",
        round: 1,
        update: () => {
          el.textContent = formatValue(current.value, format);
        },
      });
    });
  }

  /* ─── Lenis (scroll suave) ─────────────────────────────── */
  // Inicializa no DOM-ready, pausa com documento oculto, drawer
  // mobile aberto e modais abertos. Contêineres com overflow usam
  // data-lenis-prevent (nunca são interceptados).

  let lenisController = null;

  function initLenis() {
    if (lenisController) return lenisController;
    if (REDUCED_MOTION || typeof window.Lenis !== "function") return null;

    const lenis = new window.Lenis({
      autoRaf: false,
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    let rafId = null;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    ready(() => {
      rafId = requestAnimationFrame(raf);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
        lenis.stop();
      } else {
        rafId = requestAnimationFrame(raf);
        lenis.start();
      }
    });

    // Pausa quando o drawer mobile está aberto (scroll lock via body class).
    const bodyMo = new MutationObserver(() => {
      if (document.body.classList.contains("aa-menu-lock")) {
        lenis.stop();
      } else if (!document.body.classList.contains("lenis-stopped")) {
        lenis.start();
      }
    });
    bodyMo.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    lenisController = {
      lenis,
      stop: () => lenis.stop(),
      start: () => lenis.start(),
      scrollTo: (target, opts) => lenis.scrollTo(target, opts),
    };
    return lenisController;
  }

  const stopLenis = () => {
    if (lenisController) lenisController.stop();
  };

  const startLenis = () => {
    if (lenisController) lenisController.start();
  };

  // Âncoras: usa o Lenis quando ativo; caso contrário, scroll nativo
  // suave (ou imediato com reduced-motion).
  function scrollToAnchor(target, offset = -80) {
    if (!target) return;
    if (lenisController) {
      lenisController.scrollTo(target, { offset });
    } else {
      target.scrollIntoView({
        behavior: REDUCED_MOTION ? "auto" : "smooth",
        block: "start",
      });
    }
  }

  /* ─── modais ───────────────────────────────────────────── */
  // Entrada suave do painel (scale + fade) e pausa do Lenis
  // enquanto um overlay está aberto (scroll lock funcional).

  const OVERLAY_SELECTORS = [".modal-overlay", ".autoassist-premium-overlay"];

  function isOpen(el) {
    return (
      el.classList.contains("open") ||
      el.classList.contains("active") ||
      el.classList.contains("show")
    );
  }

  function initModals() {
    const animate = animeAvailable() && !REDUCED_MOTION;

    const prepare = (overlay) => {
      const panel = overlay.querySelector(".modal-content");
      if (panel && animate && !panel.dataset.aaModal) {
        panel.dataset.aaModal = "1";
        anime.set(panel, { opacity: 0, scale: 0.96 });
      }
    };

    document
      .querySelectorAll(OVERLAY_SELECTORS.join(","))
      .forEach(prepare);

    const io = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const overlay = mutation.target;
        if (!(overlay instanceof HTMLElement)) continue;
        if (!OVERLAY_SELECTORS.some((sel) => overlay.matches(sel))) continue;

        const open = isOpen(overlay);
        if (open) {
          stopLenis();
          if (animate) {
            const panel = overlay.querySelector(".modal-content");
            if (panel) {
              anime.set(panel, { opacity: 0, scale: 0.96 });
              anime({
                targets: panel,
                opacity: 1,
                scale: 1,
                duration: 320,
                easing: "easeOutCubic",
              });
            }
          }
        } else {
          startLenis();
          if (animate) {
            const panel = overlay.querySelector(".modal-content");
            if (panel) anime.set(panel, { opacity: 0, scale: 0.96 });
          }
        }
      }
    });

    io.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ["class"],
    });
  }

  /* ─── toasts ───────────────────────────────────────────── */
  // Entrada lateral (slide + fade) e saída (fade + translate).
  // Fallback simples sem animação quando anime.js não está disponível.

  function initToasts() {
    // Sem ação global no load: usado sob demanda via AAAnim.toasts.show().
  }

  function showToast(el, opts = {}) {
    if (!el) return;
    const duration = opts.duration || 5000;
    const animate = animeAvailable() && !REDUCED_MOTION;

    if (!animate) {
      el.style.display = "block";
      setTimeout(() => {
        el.style.display = "none";
      }, duration);
      return;
    }

    el.style.display = "block";
    anime.set(el, { opacity: 0, translateX: 32 });
    anime({
      targets: el,
      opacity: 1,
      translateX: 0,
      duration: 350,
      easing: "easeOutCubic",
    });

    setTimeout(() => {
      anime({
        targets: el,
        opacity: 0,
        translateY: 10,
        duration: 300,
        easing: "easeInCubic",
        complete: () => {
          el.style.display = "none";
          anime.set(el, { opacity: 1, translateX: 0, translateY: 0 });
        },
      });
    }, duration);
  }

  /* ─── formulários ──────────────────────────────────────── */
  // Quando uma mensagem de erro aparece (display/class), aplica
  // shake curto no elemento e glow vermelho temporário nos inputs.

  const ERROR_ID = /(^|\s)error(\.)?/i;
  const ERROR_CLASS = /(^|\s)(input-error|form-error|error-box|error-message)(\s|$)/i;

  function isVisible(el) {
    return el.style.display !== "none" && el.getClientRects().length > 0;
  }

  function shake(el) {
    anime({
      targets: el,
      translateX: [0, -8, 8, -5, 5, -3, 3, 0],
      duration: 420,
      easing: "easeInOutSine",
    });
  }

  function initForms() {
    const animate = animeAvailable() && !REDUCED_MOTION;
    if (!animate) return;

    const io = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const el = mutation.target;
        if (!(el instanceof HTMLElement)) continue;

        const isErrorTarget =
          (typeof el.id === "string" && ERROR_ID.test(el.id)) ||
          (typeof el.className === "string" && ERROR_CLASS.test(el.className));

        if (!isErrorTarget || !isVisible(el)) continue;
        if (el.dataset.aaShake) continue;

        el.dataset.aaShake = "1";
        shake(el);

        const form = el.closest("form");
        if (form) {
          form
            .querySelectorAll("input, select, textarea")
            .forEach((input) => {
              if (!(input instanceof HTMLElement)) return;
              input.classList.add("aa-input-error");
              setTimeout(() => input.classList.remove("aa-input-error"), 900);
            });
        }

        setTimeout(() => {
          delete el.dataset.aaShake;
        }, 700);
      }
    });

    io.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ["style", "class"],
    });
  }

  /* ─── chat ─────────────────────────────────────────────── */
  // Mensagens entram com fade + leve slide; erros ganham shake +
  // borda vermelha; botão de enviar tem feedback visual; histórico
  // entra em sequência (stagger).

  function initChat() {
    const messages = document.getElementById("messages");
    if (!messages) return;

    const animate = animeAvailable() && !REDUCED_MOTION;

    const animateRow = (row) => {
      const isError = /^Erro/i.test((row.textContent || "").trim());

      if (!animate) {
        if (isError) row.classList.add("aa-msg-error");
        return;
      }

      anime.set(row, { opacity: 0, translateY: 12 });
      anime({
        targets: row,
        opacity: 1,
        translateY: 0,
        duration: 320,
        easing: "easeOutCubic",
      });

      if (isError) {
        anime({
          targets: row,
          translateX: [0, -9, 9, -6, 6, -3, 3, 0],
          duration: 500,
          easing: "easeInOutSine",
          complete: () => row.classList.add("aa-msg-error"),
        });
        setTimeout(() => row.classList.remove("aa-msg-error"), 2500);
      }
    };

    const mo = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches && node.matches(".message-row")) {
            animateRow(node);
          } else if (node.querySelectorAll) {
            node
              .querySelectorAll(".message-row")
              .forEach((row) => animateRow(row));
          }
        }
      }
    });
    mo.observe(messages, { childList: true });

    // Feedback visual do botão de enviar
    const send = document.getElementById("send");
    if (send && animate) {
      const pulse = () => {
        anime({
          targets: send,
          scale: [1, 0.92, 1],
          duration: 260,
          easing: "easeOutCubic",
        });
      };
      send.addEventListener("click", pulse);
    }

    // Histórico: linhas em sequência (stagger) ao renderizar
    const history = document.getElementById("chatHistoryList");
    if (history && animate) {
      const stagger = () => {
        const items = [];
        for (const child of history.children) {
          if (child instanceof HTMLElement && !child.dataset.aaStaggered) {
            items.push(child);
          }
        }
        if (!items.length) return;
        items.forEach((el) => (el.dataset.aaStaggered = "1"));
        anime({
          targets: items,
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 350,
          easing: "easeOutCubic",
          delay: anime.stagger(40),
        });
      };
      const historyMo = new MutationObserver(stagger);
      historyMo.observe(history, { childList: true });
      stagger();
    }
  }

  /* ─── dashboard ────────────────────────────────────────── */
  // Cards entram com stagger (header → veículo → stats → ação) e
  // contadores ([data-count]) sobem. Observa re-renders sem repetir
  // animações nos mesmos elementos.

  const DASHBOARD_SELECTOR =
    ".dashboard-header, .vehicle-card, .stat-card, .btn-action";

  function initDashboard() {
    const content = document.getElementById("dashboardContent");
    if (!content) return;

    const animate = animeAvailable() && !REDUCED_MOTION;
    const done = new WeakSet();
    let pending = false;

    const enter = () => {
      const nodes = Array.from(
        content.querySelectorAll(DASHBOARD_SELECTOR)
      ).filter((el) => !done.has(el));

      if (!nodes.length) {
        animateCounters(content);
        return;
      }

      nodes.forEach((el) => done.add(el));

      if (animate) {
        anime({
          targets: nodes,
          opacity: [0, 1],
          translateY: [18, 0],
          duration: 480,
          easing: "easeOutCubic",
          delay: anime.stagger(80),
        });
      }
      animateCounters(content);
    };

    const mo = new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        enter();
      });
    });
    mo.observe(content, { childList: true, subtree: true });

    enter();
  }

  /* ─── FAQ (accordion) ──────────────────────────────────── */
  // Abre/fecha com altura animada, fade do conteúdo e rotação do
  // chevron. Primeiro item inicia aberto. Com reduced-motion todo o
  // conteúdo permanece visível.

  function initAccordion() {
    const items = Array.from(document.querySelectorAll(".faq-item"));
    if (!items.length) return;

    const animate = animeAvailable() && !REDUCED_MOTION;

    const setOpen = (item, open) => {
      const panel = item.querySelector("p");
      const chevron = item.querySelector(".faq-chevron");
      if (!panel) return;

      item.classList.toggle("open", open);

      if (!animate) {
        panel.style.display = open ? "block" : "none";
        return;
      }

      anime.remove(panel);
      panel.style.overflow = "hidden";

      if (open) {
        panel.style.height = "0px";
        panel.style.opacity = "0";
        anime({
          targets: panel,
          height: panel.scrollHeight,
          opacity: 1,
          duration: 320,
          easing: "easeOutCubic",
          complete: () => {
            panel.style.height = "auto";
            panel.style.overflow = "";
          },
        });
        if (chevron) {
          anime({
            targets: chevron,
            rotate: 180,
            duration: 320,
            easing: "easeOutCubic",
          });
        }
      } else {
        anime({
          targets: panel,
          height: 0,
          opacity: 0,
          duration: 280,
          easing: "easeInCubic",
          complete: () => {
            panel.style.overflow = "";
          },
        });
        if (chevron) {
          anime({
            targets: chevron,
            rotate: 0,
            duration: 280,
            easing: "easeInCubic",
          });
        }
      }
    };

    items.forEach((item, index) => {
      const trigger = item.querySelector("h3");
      if (!trigger) return;

      trigger.setAttribute("role", "button");
      trigger.setAttribute("tabindex", "0");
      trigger.classList.add("faq-trigger");

      const panel = item.querySelector("p");
      if (!panel) return;

      if (animate) {
        const chevron = document.createElement("i");
        chevron.className = "fas fa-chevron-down faq-chevron";
        chevron.setAttribute("aria-hidden", "true");
        trigger.appendChild(chevron);

        panel.style.display = "block";
        if (index !== 0) {
          panel.style.height = "0px";
          panel.style.opacity = "0";
          item.classList.remove("open");
        } else {
          item.classList.add("open");
          panel.style.height = "auto";
          panel.style.opacity = "1";
        }
      }

      trigger.addEventListener("click", () =>
        setOpen(item, !item.classList.contains("open"))
      );
      trigger.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setOpen(item, !item.classList.contains("open"));
        }
      });
    });
  }

  /* ─── entry point ──────────────────────────────────────── */

  const AAAnim = {
    hero: { run: initHero },
    reveal: { init: initReveal, staggerIn },
    cards: { init: initCards },
    counters: { animate: animateCounters },
    modals: { init: initModals },
    toasts: { show: showToast, init: initToasts },
    forms: { init: initForms },
    chat: { init: initChat },
    dashboard: { init: initDashboard },
    accordion: { init: initAccordion },
    scrollToAnchor,
  };

  window.AAAnim = AAAnim;

  ready(() => {
    initLenis();
    initForms();
    initModals();
    initToasts();
    initChat();
    initDashboard();
    initAccordion();
    initHero();

    // Reveal genérico por atributo (páginas de conteúdo/landing).
    initReveal("[data-aa-reveal]");

    // Landing page.
    if (document.body.classList.contains("home")) {
      initReveal(".feature-deck__header, .feature-tile", { stagger: 80 });
      initReveal(".home-premium__inner > *", { stagger: 60 });
    }

    // Planos.
    if (document.body.classList.contains("plans-page")) {
      initReveal(".plans-header, .plans-grid, .plans-guarantee, .plans-faq", {
        stagger: 70,
      });
    }

    // Hover de cards (landing, biblioteca, planos).
    initCards(".feature-tile, .video-card, .link-card, .plan-card");

    // Pop sutil para elementos marcados (ex.: página de pagamento).
    if (!REDUCED_MOTION && animeAvailable()) {
      document.querySelectorAll("[data-aa-pop]").forEach((el) => {
        anime({
          targets: el,
          scale: [0.9, 1],
          opacity: [0, 1],
          duration: 600,
          easing: "easeOutBack(1.2)",
          delay: 150,
        });
      });
    }
  });
})();
