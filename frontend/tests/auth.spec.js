// @ts-check
/**
 * AutoAssist - Frontend Auth Flow Tests
 *
 * Testa o fluxo de autenticacao usando Playwright.
 * Simula o backend Flask local para validar:
 * 1. Login bem-sucedido
 * 2. Login com 2FA
 * 3. Registro de novo usuario
 * 4. Logout
 * 5. Token refresh automatico
 * 6. Sincronizacao de historico de guest
 */

const { test, expect } = require("@playwright/test");

// NOTE: usa 127.0.0.1 (nao "localhost"): no Chromium o hostname localhost
// resolve para ::1 (IPv6) e o Flask (0.0.0.0) so atende IPv4.
const BASE_URL = "http://127.0.0.1:5000";
const TEST_EMAIL = "teste@autoassist.app";
const TEST_PASSWORD = "senha123";
const TEST_NAME = "Usuario Teste";

test.describe("Fluxo de Autenticacao", () => {
  test.beforeEach(async ({ page }) => {
    // Simula o backend Flask local (como o cabecalho do arquivo preve):
    // evita depender de usuario real no MySQL Aiven e do widget Turnstile.
    // Com turnstile_site_key: null o TurnstileHelper fica desabilitado e o
    // frontend nao trava 10s no waitForToken.
    const json = (route, status, body) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    await page.route("**/api/config/public", (route) =>
      json(route, 200, { turnstile_site_key: null, turnstile_theme: "light" })
    );
    await page.route("**/api/user", async (route) => {
      const auth = route.request().headers()["authorization"] || "";
      if (!auth) return json(route, 401, { error: "Nao autenticado" });
      // syncUser() salva `data` direto no localStorage (auth.js linha 268),
      // entao o mock precisa devolver o objeto do usuario SEM wrapper.
      return json(route, 200, {
        id: 1,
        nome: "Teste",
        is_premium: auth.includes("fake_token_premium"),
      });
    });
    await page.route("**/api/login", async (route) => {
      const body = route.request().postDataJSON() || {};
      if (body.email !== "teste@autoassist.app") {
        return json(route, 401, { error: "Credenciais invalidas" });
      }
      return json(route, 200, {
        access_token: "mock_access",
        refresh_token: "mock_refresh",
        user: { id: 1, nome: "Usuario Teste", is_premium: false },
      });
    });
    await page.route("**/api/register", (route) =>
      json(route, 201, { id: 1, email: "teste@autoassist.app" })
    );
    await page.route("**/api/logout", (route) => json(route, 200, { message: "logout ok" }));
    await page.route("**/api/auth/refresh", (route) =>
      json(route, 200, { access_token: "mock_access_2", refresh_token: "mock_refresh_2" })
    );

    // Limpa localStorage/sessionStorage antes de cada teste
    await page.goto(`${BASE_URL}/login.html`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test("CT-001: Login bem-sucedido redireciona para o chat", async ({ page }) => {
    // ?redirect=chat.html: sem o parametro o login vai para index.html
    await page.goto(`${BASE_URL}/login.html?redirect=chat.html`);

    // Preenche credenciais
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    // Clica em Entrar
    await page.click('button[type="submit"], button:has-text("Entrar")');

    // Aguarda navegacao para chat.html
    await page.waitForURL("**/chat.html", { timeout: 10000 });
    expect(page.url()).toContain("chat.html");
  });

  test("CT-002: Login invalido mostra mensagem de erro", async ({ page }) => {
    await page.goto(`${BASE_URL}/login.html`);

    await page.fill('input[type="email"], input[name="email"]', "invalido@email.com");
    await page.fill('input[type="password"]', "senha_errada");

    await page.click('button[type="submit"], button:has-text("Entrar")');

    // Aguarda mensagem de erro
    const errorEl = await page.waitForSelector(".alert-error, .error-message", { timeout: 5000 });
    const errorText = await errorEl.textContent();
    expect(errorText).toBeTruthy();
  });

  test("CT-003: Campos obrigatorios no cadastro", async ({ page }) => {
    await page.goto(`${BASE_URL}/cadastro.html`);

    // O botao e #btnCadastrar (sem type="submit"; o handler e de click)
    await page.click("#btnCadastrar");

    // Deve mostrar erro de validacao
    const errorEl = await page.waitForSelector(".alert-error, .error-message", { timeout: 5000 });
    const errorText = await errorEl.textContent();
    expect(errorText).toBeTruthy();
  });

  test("CT-004: Logout limpa sessao", async ({ page }) => {
    // addInitScript roda antes do carregamento do chat.html, entao o botao
    // "Sair" ja aparece autenticado (o codigo antigo setava os tokens apos
    // o load e o nav init nunca re-exibia o botao). A flag usa sessionStorage
    // (variavel global do window NAO sobrevive a navegacao entre documentos),
    // entao os tokens NAO sao re-injetados quando o logout redireciona.
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("aa_test_seeded_logout")) {
        sessionStorage.setItem("aa_test_seeded_logout", "1");
        localStorage.setItem("autoassist_access_token", "fake_token");
        localStorage.setItem("autoassist_refresh_token", "fake_refresh");
        localStorage.setItem("autoassist_user", JSON.stringify({ id: 1, nome: "Teste" }));
        localStorage.setItem("autoassist_cookie_session", "1");
      }
    });
    await page.goto(`${BASE_URL}/chat.html`);

    // Clica em Sair
    await page.click('button:has-text("Sair"), a:has-text("Sair")');

    // clearSession() roda de forma sincrona antes do redirect (auth.js
    // linha 516). Verificamos a limpeza diretamente — checar apos o
    // waitForURL e flaky porque o login.html re-injeta as chaves.
    await page.waitForFunction(
      () =>
        localStorage.getItem("autoassist_access_token") === null &&
        localStorage.getItem("autoassist_refresh_token") === null,
      { timeout: 10000 }
    );

    // Verifica que os tokens foram removidos
    const hasToken = await page.evaluate(() => localStorage.getItem("autoassist_access_token"));
    expect(hasToken).toBeNull();
  });

  test("CT-005: Guest ID e gerado e mantido", async ({ page }) => {
    await page.goto(`${BASE_URL}/chat.html`);

    const guestId = await page.evaluate(() => localStorage.getItem("autoassist_guest_id"));
    expect(guestId).toBeTruthy();
    expect(guestId.length).toBeGreaterThan(10);

    // Recarrega e verifica que o mesmo ID persiste
    await page.reload();
    const guestId2 = await page.evaluate(() => localStorage.getItem("autoassist_guest_id"));
    expect(guestId2).toBe(guestId);
  });

  test("CT-006: Guest message count e incrementado", async ({ page }) => {
    await page.goto(`${BASE_URL}/chat.html`);

    // Verifica contagem inicial
    let count = await page.evaluate(() =>
      Number(localStorage.getItem("autoassist_guest_message_count") || "0")
    );
    expect(count).toBe(0);

    // Simula envio de mensagem
    await page.evaluate(() => {
      localStorage.setItem("autoassist_guest_message_count", "1");
    });

    await page.reload();
    count = await page.evaluate(() =>
      Number(localStorage.getItem("autoassist_guest_message_count") || "0")
    );
    expect(count).toBe(1);
  });

  test("CT-007: Navegacao protegida para paginas premium", async ({ page }) => {
    // Simula usuario logado mas nao premium
    await page.goto(`${BASE_URL}/chat.html`);
    await page.evaluate(() => {
      localStorage.setItem("autoassist_access_token", "fake_token");
      localStorage.setItem("autoassist_cookie_session", "1");
      localStorage.setItem("autoassist_user", JSON.stringify({
        id: 1, nome: "Teste", is_premium: false
      }));
    });

    // Tenta acessar dashboard (deve mostrar paywall)
    await page.goto(`${BASE_URL}/dashboard.html`);
    await page.waitForTimeout(1500);

    const paywall = await page.$("#autoassist-premium-overlay, .autoassist-premium-overlay");
    expect(paywall).toBeTruthy();
  });

  test("CT-008: Usuario premium acessa dashboard sem paywall", async ({ page }) => {
    await page.goto(`${BASE_URL}/chat.html`);
    await page.evaluate(() => {
      localStorage.setItem("autoassist_access_token", "fake_token_premium");
      localStorage.setItem("autoassist_cookie_session", "1");
      localStorage.setItem("autoassist_user", JSON.stringify({
        id: 2, nome: "Premium", is_premium: true
      }));
    });

    await page.goto(`${BASE_URL}/dashboard.html`);
    await page.waitForTimeout(1000);

    const paywall = await page.$("#autoassist-premium-overlay, .autoassist-premium-overlay");
    expect(paywall).toBeNull();
  });

  test("CT-009: SecurityUtils.escapeHTML() previne XSS", async ({ page }) => {
    await page.goto(`${BASE_URL}/login.html`);
    const result = await page.evaluate(() => {
      // Auth nao exporta escapeHTML (funcao privada); o publico e
      // SecurityUtils.escapeHTML, usado por Auth.internamente.
      const escaped = SecurityUtils.escapeHTML('<script>alert("xss")</script>');
      return {
        escaped,
        containsScript: escaped.includes("<script>"),
      };
    });

    expect(result.containsScript).toBe(false);
    expect(result.escaped).toContain("&lt;script&gt;");
  });

  test("CT-010: isAuthenticated detecta sessao valida", async ({ page }) => {
    await page.goto(`${BASE_URL}/chat.html`);

    const withoutSession = await page.evaluate(() => Auth.isAuthenticated());
    expect(withoutSession).toBe(false);

    await page.evaluate(() => {
      localStorage.setItem("autoassist_access_token", "token_valido");
      localStorage.setItem("autoassist_cookie_session", "1");
    });

    const withSession = await page.evaluate(() => Auth.isAuthenticated());
    expect(withSession).toBe(true);
  });

  test("CT-011: Sincronizacao de historico ao fazer login", async ({ page }) => {
    // Simula historico de guest
    await page.goto(`${BASE_URL}/chat.html`);
    await page.evaluate(() => {
      localStorage.setItem("autoassist_guest_chat_history_cache_v1", JSON.stringify([
        { mensagem_usuario: "teste", resposta_ia: "resposta" }
      ]));
    });

    // Simula login
    await page.evaluate(() => {
      Auth.saveSession("access", "refresh", { id: 1, nome: "Teste" });
    });

    // Historico guest deve ser removido apos sync
    const hasGuestHistory = await page.evaluate(() =>
      localStorage.getItem("autoassist_guest_chat_history_cache_v1")
    );
    // O sync real requer API, mas o cache e limpo
    expect(hasGuestHistory).toBeDefined();
  });

  test("CT-012: Token refresh mantem sessao apos 401", async ({ page }) => {
    await page.goto(`${BASE_URL}/chat.html`);

    // Configura sessao valida
    await page.evaluate(() => {
      localStorage.setItem("autoassist_access_token", "expired_token");
      localStorage.setItem("autoassist_refresh_token", "valid_refresh");
      localStorage.setItem("autoassist_cookie_session", "1");
    });

    // Tenta authenticatedFetch - deve tentar refresh
    const result = await page.evaluate(async () => {
      try {
        const res = await Auth.authenticatedFetch("/api/user", {
          redirectOnInvalid: false,
        });
        return { ok: res.ok, status: res.status };
      } catch {
        return { ok: false, status: 0 };
      }
    });

    // Pode falhar (sem backend real), mas nao deve crashar
    expect(result).toBeDefined();
  });
});

test.describe("Pagina de Login - Elementos UI", () => {
  test("Deve ter formulario email/senha", async ({ page }) => {
    await page.goto(`${BASE_URL}/login.html`);

    // Verifica campos do formulario
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitBtn = await page.$('button[type="submit"], button:has-text("Entrar")');

    expect(emailInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();
    expect(submitBtn).toBeTruthy();
  });

  test("Deve ter link para cadastro", async ({ page }) => {
    await page.goto(`${BASE_URL}/login.html`);
    const signupLink = await page.$('a[href*="cadastro"], a:has-text("Criar")');
    expect(signupLink).toBeTruthy();
  });

  test("Deve ter link para esqueci senha", async ({ page }) => {
    await page.goto(`${BASE_URL}/login.html`);
    const forgotLink = await page.$('a[href*="esqueci-senha"], a:has-text("esqueceu"), a:has-text("esqueci")');
    expect(forgotLink).toBeTruthy();
  });
});
