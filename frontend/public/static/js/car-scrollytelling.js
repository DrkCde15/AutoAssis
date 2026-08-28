(function () {
    const section = document.getElementById("scrolly-cars");
    const canvas = document.getElementById("autoassist-car-canvas");
    if (!section || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) {
        section.classList.add("car-scroll--fallback");
        return;
    }

    const navbar = document.querySelector(".navbar");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cycleDuration = 3000;
    const transitionDuration = prefersReducedMotion ? 0 : 900;

    const carSources = [
        "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=70&w=1280",
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=70&w=1280",
        "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=70&w=1280",
        "https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=70&w=1280",
        "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?q=70&w=1280",
    ];

    const accents = ["#38bdf8", "#f59e0b", "#34d399", "#a78bfa", "#60a5fa"];
    const loadedCars = carSources.map((src) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.decoding = "async";
        image.src = src;
        return image;
    });

    let width = 1;
    let height = 1;
    let dpr = 1;
    let bgCanvas = null;
    let bgCtx = null;
    let panelCache = [];

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const lerp = (from, to, amount) => from + (to - from) * amount;
    const smoother = (value) => value * value * (3 - 2 * value);

    function updateHeaderOffset() {
        const headerHeight = navbar ? Math.ceil(navbar.getBoundingClientRect().height) : 0;
        if (headerHeight > 0) {
            section.style.setProperty("--car-scroll-header-offset", `${headerHeight}px`);
        }
    }

    function resize() {
        const bounds = canvas.getBoundingClientRect();
        width = Math.max(1, Math.floor(bounds.width || window.innerWidth));
        height = Math.max(1, Math.floor(bounds.height || window.innerHeight));
        // Em telas pequenas usamos DPR 1: o canvas cobre a viewport inteira e
        // repintar milhões de pixels por frame é o que mais trava em celulares.
        dpr = width < 700 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildStaticBackground();
    }

    // Fundo plano (slide de PowerPoint): gradiente escuro neutro, sem estrada nem
    // efeitos. Pré-renderizado uma vez; por frame apenas copiamos o bitmap.
    function buildStaticBackground() {
        bgCanvas = document.createElement("canvas");
        bgCanvas.width = canvas.width;
        bgCanvas.height = canvas.height;
        bgCtx = bgCanvas.getContext("2d");
        if (!bgCtx) return;
        bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const sky = bgCtx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, "#080b12");
        sky.addColorStop(0.42, "#0f172a");
        sky.addColorStop(1, "#040507");
        bgCtx.fillStyle = sky;
        bgCtx.fillRect(0, 0, width, height);
    }

    function roundedRect(ctx, x, y, w, h, radius) {
        const r = Math.min(radius, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function drawImageCover(ctx, image, x, y, w, h) {
        if (!image.complete || image.naturalWidth === 0) {
            const placeholder = ctx.createLinearGradient(x, y, x + w, y + h);
            placeholder.addColorStop(0, "#111827");
            placeholder.addColorStop(1, "#1d4ed8");
            ctx.fillStyle = placeholder;
            roundedRect(ctx, x, y, w, h, 20);
            ctx.fill();
            return;
        }

        const imageRatio = image.naturalWidth / image.naturalHeight;
        const targetRatio = w / h;
        let sx = 0;
        let sy = 0;
        let sw = image.naturalWidth;
        let sh = image.naturalHeight;

        if (imageRatio > targetRatio) {
            sw = image.naturalHeight * targetRatio;
            sx = (image.naturalWidth - sw) / 2;
        } else {
            sh = image.naturalWidth / targetRatio;
            sy = (image.naturalHeight - sh) / 2;
        }

        ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
    }

    // Apenas as partes que se movem de fato: brilho radial lento + tracejados
    // da estrada. O resto (céu/estrada/linhas) vem do bgCanvas pré-renderizado.
    function drawDynamicBackground(ctx, carouselProgress, elapsed) {
        const glowX = width * (0.5 + Math.sin(elapsed * 0.00028) * 0.06);
        const glowY = height * 0.4;
        const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, Math.max(width, height) * 0.68);
        glow.addColorStop(0, "rgba(59, 130, 246, 0.2)");
        glow.addColorStop(0.35, "rgba(14, 165, 233, 0.08)");
        glow.addColorStop(1, "rgba(2, 6, 23, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        const horizon = height * 0.56;
        const roadTop = width * 0.16;
        const roadBottom = width * 1.26;
        ctx.save();
        ctx.translate(width / 2, 0);

        for (let i = 0; i < 18; i += 1) {
            const phase = (i / 18 + carouselProgress * 0.5 + elapsed * 0.00008) % 1;
            const y = lerp(horizon + 8, height + 24, phase * phase);
            const half = lerp(roadTop, roadBottom, phase);
            ctx.strokeStyle = `rgba(148, 163, 184, ${lerp(0.08, 0.24, phase)})`;
            ctx.lineWidth = lerp(0.4, 1.4, phase);
            ctx.beginPath();
            ctx.moveTo(-half, y);
            ctx.lineTo(half, y);
            ctx.stroke();
        }

        ctx.restore();
    }

    function drawSpeedLines(ctx, elapsed) {
        const lineCount = width < 700 ? 20 : 32;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        for (let i = 0; i < lineCount; i += 1) {
            const seed = (i * 97.13) % 1;
            const phase = (seed + elapsed * 0.00016) % 1;
            const side = i % 2 === 0 ? -1 : 1;
            const x = width * 0.5 + side * lerp(width * 0.16, width * 0.54, phase);
            const y = lerp(height * 0.22, height * 0.88, phase);
            const length = lerp(22, 98, phase);
            ctx.strokeStyle = `rgba(125, 211, 252, ${lerp(0.035, 0.16, phase)})`;
            ctx.lineWidth = lerp(1, 2.2, phase);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + side * length, y + length * 0.16);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawPanel(ctx, image, options) {
        const { x, y, w, h, rotation, skew, opacity, accent, highlight } = options;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.transform(1, skew, -skew * 0.55, 1, 0, 0);
        ctx.globalAlpha = opacity;

        ctx.shadowColor = "rgba(0, 0, 0, 0.62)";
        ctx.shadowBlur = highlight ? 34 : 20;
        ctx.shadowOffsetY = highlight ? 22 : 14;
        roundedRect(ctx, -w / 2, -h / 2, w, h, 20);
        ctx.fillStyle = "#0f172a";
        ctx.fill();
        ctx.clip();

        drawImageCover(ctx, image, -w / 2, -h / 2, w, h);

        const shade = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        shade.addColorStop(0, "rgba(255, 255, 255, 0.12)");
        shade.addColorStop(0.38, "rgba(255, 255, 255, 0)");
        shade.addColorStop(0.72, "rgba(2, 6, 23, 0.2)");
        shade.addColorStop(1, "rgba(2, 6, 23, 0.42)");
        ctx.fillStyle = shade;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.transform(1, skew, -skew * 0.55, 1, 0, 0);
        ctx.globalAlpha = opacity;
        roundedRect(ctx, -w / 2, -h / 2, w, h, 20);
        ctx.strokeStyle = highlight ? accent : "rgba(148, 163, 184, 0.28)";
        ctx.lineWidth = highlight ? 2 : 1;
        ctx.stroke();

        if (highlight) {
            ctx.globalCompositeOperation = "screen";
            ctx.strokeStyle = accent;
            ctx.globalAlpha = opacity * 0.42;
            ctx.lineWidth = 8;
            roundedRect(ctx, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 16);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawReflection(ctx, image, x, y, w, h, opacity) {
        if (!image.complete || image.naturalWidth === 0) return;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, -1);
        ctx.globalAlpha = opacity;
        roundedRect(ctx, -w / 2, -h / 2, w, h, 18);
        ctx.clip();
        drawImageCover(ctx, image, -w / 2, -h / 2, w, h);

        const fade = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        fade.addColorStop(0, "rgba(4, 5, 7, 0.12)");
        fade.addColorStop(0.58, "rgba(4, 5, 7, 0.66)");
        fade.addColorStop(1, "rgba(4, 5, 7, 1)");
        ctx.fillStyle = fade;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
    }

    function getCarouselProgress(elapsed) {        const cycle = elapsed % cycleDuration;
        const currentIndex = Math.floor(elapsed / cycleDuration) % loadedCars.length;
        const nextIndex = (currentIndex + 1) % loadedCars.length;
        const transition = transitionDuration > 0
            ? smoother(clamp((cycle - (cycleDuration - transitionDuration)) / transitionDuration, 0, 1))
            : 0;

        if (currentIndex === loadedCars.length - 1 && nextIndex === 0 && transition > 0) {
            return currentIndex + transition;
        }

        return currentIndex + transition;
    }

    function getPanelBaseSize() {
        const baseW = Math.min(width * (width < 700 ? 1.08 : 0.78), 896);
        const baseH = baseW * (width < 700 ? 0.62 : 0.54);
        return { baseW, baseH };
    }

    // Pré-renderiza cada painel de carro (sombra + moldura + imagem + sombreado)
    // num bitmap offscreen. Por frame, em vez de recalcular shadowBlur/clip/gradient
    // para 5 imagens, apenas copiamos o bitmap com drawImage. É o ganho maior de
    // performance deste canvas.
    function buildPanelCache() {
        panelCache = [];
        const { baseW, baseH } = getPanelBaseSize();
        loadedCars.forEach((image) => {
            const c = document.createElement("canvas");
            c.width = Math.max(1, Math.floor(baseW * dpr));
            c.height = Math.max(1, Math.floor(baseH * dpr));
            const cc = c.getContext("2d");
            if (!cc) {
                panelCache.push(null);
                return;
            }
            cc.setTransform(dpr, 0, 0, dpr, 0, 0);

            cc.save();
            cc.shadowColor = "rgba(0, 0, 0, 0.62)";
            cc.shadowBlur = 20;
            cc.shadowOffsetY = 14;
            roundedRect(cc, -baseW / 2, -baseH / 2, baseW, baseH, 20);
            cc.fillStyle = "#0f172a";
            cc.fill();
            cc.restore();

            cc.save();
            roundedRect(cc, -baseW / 2, -baseH / 2, baseW, baseH, 20);
            cc.clip();
            drawImageCover(cc, image, -baseW / 2, -baseH / 2, baseW, baseH);
            const shade = cc.createLinearGradient(-baseW / 2, -baseH / 2, baseW / 2, baseH / 2);
            shade.addColorStop(0, "rgba(255, 255, 255, 0.12)");
            shade.addColorStop(0.38, "rgba(255, 255, 255, 0)");
            shade.addColorStop(0.72, "rgba(2, 6, 23, 0.2)");
            shade.addColorStop(1, "rgba(2, 6, 23, 0.42)");
            cc.fillStyle = shade;
            cc.fillRect(-baseW / 2, -baseH / 2, baseW, baseH);
            cc.restore();

            cc.save();
            roundedRect(cc, -baseW / 2, -baseH / 2, baseW, baseH, 20);
            cc.strokeStyle = "rgba(148, 163, 184, 0.28)";
            cc.lineWidth = 1;
            cc.stroke();
            cc.restore();

            panelCache.push({ canvas: c, cssW: baseW, cssH: baseH });
        });
    }

    // Fundo full-bleed tipo PowerPoint: um carro por vez cobrindo todo o canvas
    // atrás do texto do hero, com cross-fade suave. Sem cards, sombras ou bordas.
    // Custo por frame: no máximo 2 drawImage.
    function drawCarCarousel(ctx, elapsed) {
        const progress = getCarouselProgress(elapsed);
        const len = loadedCars.length;
        const idx = ((Math.floor(progress) % len) + len) % len;
        const frac = progress - Math.floor(progress);
        const nextIdx = (idx + 1) % len;

        drawImageCover(ctx, loadedCars[idx], 0, 0, width, height);

        if (frac > 0.001) {
            ctx.save();
            ctx.globalAlpha = smoother(clamp(frac, 0, 1));
            drawImageCover(ctx, loadedCars[nextIdx], 0, 0, width, height);
            ctx.restore();
        }
    }

    function drawDataOverlays(ctx, elapsed) {
        const activeIndex = Math.floor(getCarouselProgress(elapsed)) % accents.length;
        const accent = accents[activeIndex] || accents[0];

        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.48;

        const centerX = width * 0.5;
        const centerY = height * (width < 700 ? 0.34 : 0.48);
        for (let i = 0; i < 4; i += 1) {
            const radius = Math.min(width, height) * (0.12 + i * 0.045);
            const pulse = prefersReducedMotion ? 0 : Math.sin(elapsed * 0.0016 + i) * 8;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radius + pulse, (radius + pulse) * 0.28, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        const nodes = width < 700 ? 5 : 8;
        for (let i = 0; i < nodes; i += 1) {
            const phase = (i / nodes + elapsed * 0.00018) % 1;
            const x = lerp(width * 0.16, width * 0.84, phase);
            const y = height * 0.18 + Math.sin(phase * Math.PI * 2 + elapsed * 0.001) * 22;
            ctx.fillStyle = accent;
            ctx.globalAlpha = 0.22 + phase * 0.26;
            ctx.beginPath();
            ctx.arc(x, y, 3 + phase * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function draw(elapsed) {
        const carouselProgress = getCarouselProgress(elapsed);
        context.clearRect(0, 0, width, height);

        if (bgCanvas && bgCtx) {
            context.drawImage(bgCanvas, 0, 0, width, height);
        }
        drawCarCarousel(context, elapsed);

        const fade = context.createLinearGradient(0, 0, 0, height);
        fade.addColorStop(0, "rgba(0, 0, 0, 0.18)");
        fade.addColorStop(0.45, "rgba(0, 0, 0, 0)");
        fade.addColorStop(1, "rgba(0, 0, 0, 0.38)");
        context.fillStyle = fade;
        context.fillRect(0, 0, width, height);
    }

    let isRunning = false;
    let lastFrame = 0;
    // Limita a ~30fps. O movimento é suave a 30fps e corta pela metade (ou mais)
    // o trabalho de CPU/GPU em telas de 60/90/120Hz, eliminando a travada.
    const FRAME_INTERVAL = 1000 / 30;

    function startLoop() {
        if (isRunning) return;
        isRunning = true;
        lastFrame = 0;
        window.requestAnimationFrame(render);
    }

    function stopLoop() {
        isRunning = false;
    }

    function render(elapsed) {
        if (!isRunning) return;
        if (elapsed - lastFrame >= FRAME_INTERVAL) {
            lastFrame = elapsed;
            draw(elapsed);
        }
        window.requestAnimationFrame(render);
    }

    window.addEventListener("resize", () => {
        updateHeaderOffset();
        resize();
    }, { passive: true });

    loadedCars.forEach((image) => {
        image.addEventListener("load", () => draw(performance.now()), { once: true });
    });

    if (navbar && "ResizeObserver" in window) {
        const headerObserver = new ResizeObserver(() => {
            updateHeaderOffset();
            resize();
        });
        headerObserver.observe(navbar);
    }

    updateHeaderOffset();
    resize();

    // Só anima quando a seção está visível na tela. Em celular, evita
    // que o loop rode eternamente consumindo CPU/GPU enquanto o usuário
    // já rolou para longe do hero.
    let isVisible = true;

    if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                isVisible = entry.isIntersecting;
                if (isVisible && !document.hidden) {
                    startLoop();
                } else {
                    stopLoop();
                }
            },
            { threshold: 0.01 }
        );
        io.observe(section);
    }

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopLoop();
        } else if (isVisible) {
            startLoop();
        }
    });

    if (prefersReducedMotion) {
        // Sem animação contínua: desenha um quadro estático e para por aí.
        draw(performance.now());
    } else {
        startLoop();
    }
})();
