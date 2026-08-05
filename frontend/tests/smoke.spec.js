// Teste de fumaça temporário (não faz parte da suíte): valida que as
// páginas carregam com anime.js/Lenis/animations sem erros de console.
const { test, expect } = require("@playwright/test");

const BASE_URL = "http://127.0.0.1:5000";

async function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("WebSocket")) {
      errors.push(`console: ${msg.text()}`);
    }
  });
  return errors;
}

test("smoke: index.html carrega e hero anima", async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: "load" });
  await page.waitForSelector(".brand-hero", { state: "visible" });

  await page.waitForFunction(() => {
    const h1 = document.querySelector("#brandHeroTitle");
    const scene = document.querySelector(".car-scroll__scene");
    if (!h1 || !scene) return false;
    return (
      parseFloat(getComputedStyle(h1).opacity) > 0.99 &&
      parseFloat(getComputedStyle(scene).opacity) > 0.99
    );
  });

  await page.waitForFunction(() =>
    document.documentElement.classList.contains("lenis")
  );
  expect(errors).toEqual([]);
});

test("smoke: dashboard.html renderiza cards e spinner de carregamento", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "autoassist_access_token",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaXNzIjoiYXV0b2Fzc2lzdCIsImV4cCI6MTk5OTk5OTk5OX0.test"
    );
    localStorage.setItem("autoassist_refresh_token", "refresh-test");
  });

  const user = {
    id: 1,
    nome: "Teste",
    email: "teste@teste.com",
    is_premium: true,
  };
  const dashboard = [
    {
      veiculo: {
        id: 1,
        tipo: "carro",
        marca: "Fiat",
        modelo: "Argo",
        ano_fabricacao: "2022",
        quilometragem: 25000,
      },
      predicao: {
        predicted_next_km: 30000,
        maintenance_label: "Troca de óleo",
        predicted_next_date: "2026-09-01",
        confidence: 0.9,
      },
      fipe: { Valor: "R$ 85.000", MesReferencia: "junho/2026" },
      estatisticas_extras: {
        health_score: 82,
        manutencoes_realizadas: 4,
        data_ultima_manutencao: "2026-07-01",
        chats_realizados: 17,
      },
      saude: [],
    },
  ];

  // Playwright verifica rotas em LIFO: a última registrada vence.
  // O catch-all deve ser registrado PRIMEIRO para as específicas terem prioridade.
  await page.route("**/api/**", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/user", (route) => route.fulfill({ json: user }));
  await page.route("**/api/dashboard/health-trend", (route) =>
    route.fulfill({ json: [] })
  );
  await page.route("**/api/dashboard", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({ json: dashboard });
  });
  await page.route("**/api/maintenance/alerts", (route) =>
    route.fulfill({ json: { alertas: [] } })
  );

  const errors = await collectErrors(page);
  await page.goto(`${BASE_URL}/dashboard.html`, { waitUntil: "load" });
  // Spinner original de carregamento enquanto a API responde (atrasada em 800ms).
  await page.waitForSelector("#loadingDash .loading, #loadingDash .fa-spin");
  await page.waitForSelector(".vehicle-card", { timeout: 10000 });

  // Valores renderizados de forma estática (como antes das animações).
  const statTexts = await page.evaluate(() => {
    const values = [];
    document.querySelectorAll(".stat-card p, .stat-card .stat-value").forEach((el) =>
      values.push(el.textContent.trim())
    );
    return values.join(" | ");
  });
  expect(statTexts).toContain("17");
  expect(statTexts).toContain("4");
  expect(statTexts).toMatch(/30[.,]000/);
  expect(errors).toEqual([]);
});

test("smoke: chat.html carrega sem erros", async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto(`${BASE_URL}/chat.html`, { waitUntil: "load" });
  await page.waitForSelector("#messages");
  expect(errors).toEqual([]);
});

test("smoke: planos.html FAQ vira accordion", async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto(`${BASE_URL}/planos.html`, { waitUntil: "load" });
  await page.waitForSelector(".faq-item");
  const firstPanel = await page.evaluate(() => {
    const items = document.querySelectorAll(".faq-item");
    const p = items[0].querySelector("p");
    return {
      count: items.length,
      open: items[0].classList.contains("open"),
      hasChevron: !!items[0].querySelector(".faq-chevron"),
    };
  });
  expect(firstPanel.count).toBe(4);
  expect(firstPanel.open).toBe(true);
  expect(firstPanel.hasChevron).toBe(true);
  expect(errors).toEqual([]);
});
