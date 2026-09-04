/**
 * chat.js — Página de Chat com IA (NOG).
 *
 * Endpoints:
 *   POST /api/chat            — envia mensagem (message, vehicle_id?, session_id?, image?, attachment?)
 *   GET  /api/chat/history     — histórico do usuário (chats[])
 *   GET  /api/chat/conversations — conversas agrupadas por session_id
 *   GET  /api/veiculos         — lista de veículos do usuário
 *   DELETE /api/chat/history/:id — deleta um registro
 *   DELETE /api/chat/session/:id — deleta uma sessão inteira
 */
(function () {
  "use strict";

  var CHAT_ENDPOINT = "/api/chat";
  var HISTORY_ENDPOINT = "/api/chat/history";
  var CONVERSATIONS_ENDPOINT = "/api/chat/conversations";
  var VEICULOS_ENDPOINT = "/api/veiculos";

  var state = {
    messages: [],
    conversations: [],
    vehicles: [],
    activeSessionId: null,
    sending: false,
    latestId: 0,
  };

  // ── DOM refs ──
  var messagesEl = null;
  var textareaEl = null;
  var sendBtn = null;
  var fileInput = null;
  var vehicleSelect = null;
  var conversationsList = null;
  var sidebarEl = null;
  var mainEl = null;
  var emptyStateEl = null;
  var typingEl = null;
  var chatWrapper = null;

  // ── Helpers ──
  function escapeHTML(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatTime(isoStr) {
    if (!isoStr) return "";
    try {
      var d = new Date(isoStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return "";
    }
  }

  function formatDate(isoStr) {
    if (!isoStr) return "";
    try {
      var d = new Date(isoStr);
      if (isNaN(d.getTime())) return "";
      var today = new Date();
      var yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (d.toDateString() === today.toDateString()) return "Hoje";
      if (d.toDateString() === yesterday.toDateString()) return "Ontem";
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
    } catch (_) {
      return "";
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function scrollToBottom(smooth) {
    if (!messagesEl) return;
    if (smooth) {
      messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
    } else {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function nl2br(str) {
    if (!str) return "";
    return escapeHTML(str).replace(/\n/g, "<br>");
  }

  function vehicleLabel(v) {
    var parts = [v.marca, v.modelo].filter(Boolean);
    var label = parts.join(" ") || "Veículo #" + v.id;
    if (v.ano_fabricacao) label += " (" + v.ano_fabricacao + ")";
    return label;
  }

  // ── Build UI ──
  function buildUI() {
    var container = document.querySelector("main") || document.querySelector("body");

    // Main wrapper
    chatWrapper = document.createElement("div");
    chatWrapper.className = "flex h-[calc(100vh-4rem)] overflow-hidden";

    // ── Sidebar ──
    sidebarEl = document.createElement("aside");
    sidebarEl.className = "hidden lg:flex flex-col w-80 border-r border-border bg-primary/50 shrink-0";

    var sidebarHeader = document.createElement("div");
    sidebarHeader.className = "flex items-center justify-between p-4 border-b border-border";
    sidebarHeader.innerHTML =
      '<h2 class="text-sm font-semibold text-primary">Conversas</h2>' +
      '<button type="button" id="chat-new-btn" class="rounded-lg bg-accent/10 p-1.5 text-accent hover:bg-accent/20 transition-colors" title="Nova conversa">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"></line><line x1="5" x2="19" y1="12" y2="12"></line></svg>' +
      '</button>';
    sidebarEl.appendChild(sidebarHeader);

    var searchWrap = document.createElement("div");
    searchWrap.className = "px-3 py-2";
    var searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Buscar conversas...";
    searchInput.className = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50";
    searchInput.id = "chat-search-input";
    searchWrap.appendChild(searchInput);
    sidebarEl.appendChild(searchWrap);

    conversationsList = document.createElement("div");
    conversationsList.id = "chat-conversations-list";
    conversationsList.className = "flex-1 overflow-y-auto";
    sidebarEl.appendChild(conversationsList);

    chatWrapper.appendChild(sidebarEl);

    // ── Main chat area ──
    mainEl = document.createElement("div");
    mainEl.className = "flex flex-col flex-1 min-w-0";

    // Chat header
    var chatHeader = document.createElement("div");
    chatHeader.className = "flex items-center gap-3 border-b border-border bg-primary/30 px-4 py-3 shrink-0";

    // Sidebar toggle (mobile)
    var toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "lg:hidden rounded-lg p-2 text-secondary hover:bg-white/5 transition-colors";
    toggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6"></line><line x1="3" x2="21" y1="12" y2="12"></line><line x1="3" x2="21" y1="18" y2="18"></line></svg>';
    toggleBtn.addEventListener("click", function () {
      sidebarEl.classList.toggle("hidden");
      sidebarEl.classList.toggle("flex");
      sidebarEl.classList.toggle("absolute");
      sidebarEl.classList.toggle("z-50");
      sidebarEl.classList.toggle("inset-0");
    });
    chatHeader.appendChild(toggleBtn);

    var headerInfo = document.createElement("div");
    headerInfo.className = "flex-1 min-w-0";
    headerInfo.innerHTML =
      '<p class="text-sm font-semibold text-primary truncate">NOG - Consultor Automotivo</p>' +
      '<p class="text-xs text-muted truncate" id="chat-session-label">Nova conversa</p>';
    chatHeader.appendChild(headerInfo);

    // Vehicle selector
    var vehicleWrap = document.createElement("div");
    vehicleWrap.className = "hidden sm:flex items-center gap-2";
    vehicleSelect = document.createElement("select");
    vehicleSelect.id = "chat-vehicle-select";
    vehicleSelect.className = "rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50 max-w-[200px]";
    var defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Sem veículo";
    vehicleSelect.appendChild(defaultOpt);
    vehicleWrap.appendChild(vehicleSelect);
    chatHeader.appendChild(vehicleWrap);

    // Attach button
    var attachBtn = document.createElement("button");
    attachBtn.type = "button";
    attachBtn.className = "rounded-lg p-2 text-secondary hover:bg-white/5 hover:text-primary transition-colors";
    attachBtn.title = "Anexar arquivo";
    attachBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>';
    attachBtn.addEventListener("click", function () { fileInput.click(); });
    chatHeader.appendChild(attachBtn);

    mainEl.appendChild(chatHeader);

    // Messages area
    messagesEl = document.createElement("div");
    messagesEl.id = "chat-messages";
    messagesEl.className = "flex-1 overflow-y-auto px-4 py-6 space-y-1";
    mainEl.appendChild(messagesEl);

    // Attachment preview (hidden by default)
    var attachmentPreview = document.createElement("div");
    attachmentPreview.id = "chat-attachment-preview";
    attachmentPreview.className = "hidden px-4 py-2 border-t border-border bg-primary/30 shrink-0";
    mainEl.appendChild(attachmentPreview);

    // File input (hidden)
    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.className = "hidden";
    fileInput.accept = "image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/csv,text/markdown,application/json";
    mainEl.appendChild(fileInput);

    // Input area
    var inputArea = document.createElement("div");
    inputArea.className = "border-t border-border bg-primary/50 px-4 py-3 shrink-0";

    var inputRow = document.createElement("div");
    inputRow.className = "flex items-end gap-2 max-w-4xl mx-auto";

    textareaEl = document.createElement("textarea");
    textareaEl.id = "chat-textarea";
    textareaEl.rows = 1;
    textareaEl.placeholder = "Pergunte ao NOG sobre seu veículo...";
    textareaEl.className = "flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 max-h-32 overflow-y-auto";
    textareaEl.style.minHeight = "44px";

    sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.id = "chat-send-btn";
    sendBtn.disabled = true;
    sendBtn.className = "rounded-xl bg-accent p-3 text-white transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed shrink-0";
    sendBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="11" y1="2" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';

    inputRow.appendChild(textareaEl);
    inputRow.appendChild(sendBtn);
    inputArea.appendChild(inputRow);
    mainEl.appendChild(inputArea);

    chatWrapper.appendChild(mainEl);
    container.appendChild(chatWrapper);
  }

  // ── Typing indicator ──
  function showTyping() {
    if (typingEl) return;
    typingEl = document.createElement("div");
    typingEl.className = "flex items-start gap-3 max-w-[85%] md:max-w-[70%]";
    typingEl.innerHTML =
      '<div class="shrink-0 mt-1">' +
        '<div class="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>' +
        '</div>' +
      '</div>' +
      '<div class="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3">' +
        '<div class="flex items-center gap-1.5">' +
          '<span class="h-2 w-2 rounded-full bg-muted animate-bounce" style="animation-delay:0ms"></span>' +
          '<span class="h-2 w-2 rounded-full bg-muted animate-bounce" style="animation-delay:150ms"></span>' +
          '<span class="h-2 w-2 rounded-full bg-muted animate-bounce" style="animation-delay:300ms"></span>' +
        '</div>' +
      '</div>';
    messagesEl.appendChild(typingEl);
    scrollToBottom(true);
  }

  function hideTyping() {
    if (typingEl) {
      typingEl.remove();
      typingEl = null;
    }
  }

  // ── Message rendering ──
  function renderMessage(msg, prepend) {
    if (!msg) return;
    var isUser = msg.role === "user";

    var wrapper = document.createElement("div");
    wrapper.className = "flex items-start gap-3 " + (isUser ? "flex-row-reverse max-w-[85%] md:max-w-[70%] ml-auto" : "max-w-[85%] md:max-w-[70%]");

    // Avatar
    var avatar = document.createElement("div");
    avatar.className = "shrink-0 mt-1";
    if (isUser) {
      avatar.innerHTML =
        '<div class="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' +
        '</div>';
    } else {
      avatar.innerHTML =
        '<div class="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>' +
        '</div>';
    }
    wrapper.appendChild(avatar);

    // Bubble
    var bubble = document.createElement("div");
    bubble.className = isUser
      ? "rounded-2xl rounded-tr-md border border-border bg-accent/10 px-4 py-3 text-sm text-primary"
      : "rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-sm text-primary";

    // Content (supports markdown-like bold and lists)
    var contentHtml = nl2br(msg.content);
    // Simple bold: **text**
    contentHtml = contentHtml.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Simple italic: *text*
    contentHtml = contentHtml.replace(/\*(.+?)\*/g, "<em>$1</em>");
    bubble.innerHTML = contentHtml;

    // Timestamp
    if (msg.timestamp) {
      var timeEl = document.createElement("div");
      timeEl.className = "mt-1 text-[10px] text-muted " + (isUser ? "text-right" : "");
      timeEl.textContent = formatTime(msg.timestamp);
      bubble.appendChild(timeEl);
    }

    // Videos
    if (msg.videos && msg.videos.length > 0) {
      var videosDiv = document.createElement("div");
      videosDiv.className = "mt-3 space-y-2 border-t border-border pt-3";
      videosDiv.innerHTML = '<p class="text-xs font-medium text-muted mb-2">Videos relacionados</p>';
      msg.videos.forEach(function (v) {
        var videoLink = document.createElement("a");
        videoLink.href = v.url || "#";
        videoLink.target = "_blank";
        videoLink.rel = "noopener noreferrer";
        videoLink.className = "flex items-center gap-2 rounded-lg border border-border p-2 text-xs text-accent hover:bg-accent/5 transition-colors";
        videoLink.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>' +
          '<span class="truncate">' + escapeHTML(v.title || v.url || "Video") + '</span>';
        videosDiv.appendChild(videoLink);
      });
      bubble.appendChild(videosDiv);
    }

    // Links
    if (msg.links && msg.links.length > 0) {
      var linksDiv = document.createElement("div");
      linksDiv.className = "mt-3 space-y-2 border-t border-border pt-3";
      linksDiv.innerHTML = '<p class="text-xs font-medium text-muted mb-2">Links uteis</p>';
      msg.links.forEach(function (l) {
        var linkEl = document.createElement("a");
        linkEl.href = l.url || "#";
        linkEl.target = "_blank";
        linkEl.rel = "noopener noreferrer";
        linkEl.className = "flex items-center gap-2 rounded-lg border border-border p-2 text-xs text-accent hover:bg-accent/5 transition-colors";
        linkEl.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>' +
          '<span class="truncate">' + escapeHTML(l.title || l.name || l.url || "Link") + '</span>';
        linksDiv.appendChild(linkEl);
      });
      bubble.appendChild(linksDiv);
    }

    wrapper.appendChild(bubble);

    if (prepend && messagesEl.firstChild) {
      messagesEl.insertBefore(wrapper, messagesEl.firstChild);
    } else {
      messagesEl.appendChild(wrapper);
    }

    return wrapper;
  }

  // ── Empty state ──
  function renderEmptyState() {
    if (!emptyStateEl) {
      emptyStateEl = document.createElement("div");
      emptyStateEl.id = "chat-empty-state";
      emptyStateEl.className = "flex flex-col items-center justify-center h-full text-center px-6 py-12";
      emptyStateEl.innerHTML =
        '<div class="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-accent"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>' +
        '</div>' +
        '<h3 class="text-lg font-semibold text-primary mb-2">Fale com o NOG</h3>' +
        '<p class="text-sm text-muted max-w-md mb-6">Seu consultor automotivo com IA. Pergunte sobre manutencao, pecas, diagnosticos ou qualquer duvida sobre seu veiculo.</p>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">' +
          '<button type="button" class="chat-suggestion rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-accent/50 hover:bg-accent/5">' +
            '<p class="text-sm font-medium text-primary">Troca de oleo</p>' +
            '<p class="text-xs text-muted mt-1">Qual oleo usar e quando trocar?</p>' +
          '</button>' +
          '<button type="button" class="chat-suggestion rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-accent/50 hover:bg-accent/5">' +
            '<p class="text-sm font-medium text-primary">Diagnostico</p>' +
            '<p class="text-xs text-muted mt-1">Meu carro faz um ruido estranho</p>' +
          '</button>' +
          '<button type="button" class="chat-suggestion rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-accent/50 hover:bg-accent/5">' +
            '<p class="text-sm font-medium text-primary">Custo estimado</p>' +
            '<p class="text-xs text-muted mt-1">Quanto custa uma revisao geral?</p>' +
          '</button>' +
          '<button type="button" class="chat-suggestion rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-accent/50 hover:bg-accent/5">' +
            '<p class="text-sm font-medium text-primary">Proxima manutencao</p>' +
            '<p class="text-xs text-muted mt-1">O que devo revisar proximamente?</p>' +
          '</button>' +
        '</div>';
      messagesEl.appendChild(emptyStateEl);

      // Suggestion clicks
      var suggestions = emptyStateEl.querySelectorAll(".chat-suggestion");
      for (var i = 0; i < suggestions.length; i++) {
        (function (btn) {
          btn.addEventListener("click", function () {
            var text = btn.querySelector("p").textContent;
            if (textareaEl) {
              textareaEl.value = text;
              autoResize();
              updateSendBtn();
            }
            sendMessage(text);
          });
        })(suggestions[i]);
      }
    }
  }

  function hideEmptyState() {
    if (emptyStateEl && emptyStateEl.parentNode) {
      emptyStateEl.remove();
      emptyStateEl = null;
    }
  }

  // ── Conversations sidebar ──
  function renderConversations() {
    if (!conversationsList) return;
    conversationsList.innerHTML = "";

    if (!state.conversations || state.conversations.length === 0) {
      var emptyMsg = document.createElement("div");
      emptyMsg.className = "px-4 py-8 text-center text-sm text-muted";
      emptyMsg.textContent = "Nenhuma conversa ainda";
      conversationsList.appendChild(emptyMsg);
      return;
    }

    state.conversations.forEach(function (conv) {
      var item = document.createElement("button");
      item.type = "button";
      var isActive = conv.session_id === state.activeSessionId;
      item.className = "w-full text-left px-4 py-3 border-b border-border transition-colors " +
        (isActive ? "bg-accent/10 border-l-2 border-l-accent" : "hover:bg-white/5");

      var title = conv.title || "Nova conversa";
      var preview = conv.preview || "";
      var count = conv.count || 0;

      item.innerHTML =
        '<div class="flex items-start justify-between gap-2">' +
          '<div class="min-w-0">' +
            '<p class="text-sm font-medium text-primary truncate">' + escapeHTML(title) + '</p>' +
            '<p class="text-xs text-muted truncate mt-0.5">' + escapeHTML(preview) + '</p>' +
          '</div>' +
          '<span class="shrink-0 text-[10px] text-muted bg-zinc-800 rounded-full px-1.5 py-0.5">' + count + '</span>' +
        '</div>';

      item.addEventListener("click", function () {
        state.activeSessionId = conv.session_id || null;
        fetchChatHistory(conv.session_id);
        updateSessionLabel(title);
        // Close sidebar on mobile
        if (sidebarEl && window.innerWidth < 1024) {
          sidebarEl.classList.add("hidden");
          sidebarEl.classList.remove("flex", "absolute", "z-50", "inset-0");
        }
      });

      conversationsList.appendChild(item);
    });

    // Delete session buttons
    var delBtns = conversationsList.querySelectorAll("[data-delete-session]");
    for (var i = 0; i < delBtns.length; i++) {
      delBtns[i].addEventListener("click", function (e) {
        e.stopPropagation();
        var sid = this.getAttribute("data-delete-session");
        deleteSession(sid);
      });
    }
  }

  function updateSessionLabel(title) {
    var label = document.getElementById("chat-session-label");
    if (label) {
      label.textContent = title || "Nova conversa";
    }
  }

  // ── Vehicle selector ──
  function populateVehicleOptions() {
    if (!vehicleSelect) return;
    while (vehicleSelect.options.length > 1) {
      vehicleSelect.remove(1);
    }
    state.vehicles.forEach(function (v) {
      var opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = vehicleLabel(v);
      vehicleSelect.appendChild(opt);
    });
  }

  // ── Textarea auto-resize ──
  function autoResize() {
    if (!textareaEl) return;
    textareaEl.style.height = "auto";
    var maxH = 128;
    textareaEl.style.height = Math.min(textareaEl.scrollHeight, maxH) + "px";
  }

  function updateSendBtn() {
    if (!sendBtn || !textareaEl) return;
    var hasText = textareaEl.value.trim().length > 0;
    sendBtn.disabled = !hasText || state.sending;
  }

  // ── Attachment handling ──
  var pendingAttachment = null;

  function handleFileSelect(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("Arquivo muito grande. Maximo 8 MB.");
      fileInput.value = "";
      return;
    }

    var reader = new FileReader();
    reader.onload = function (ev) {
      pendingAttachment = {
        name: file.name,
        type: file.type,
        size: file.size,
        data: ev.target.result,
      };
      showAttachmentPreview(file.name, file.size);
    };
    reader.readAsDataURL(file);
    fileInput.value = "";
  }

  function showAttachmentPreview(name, size) {
    var preview = document.getElementById("chat-attachment-preview");
    if (!preview) return;
    preview.className = "flex items-center gap-3 px-4 py-2 border-t border-border bg-primary/30 shrink-0";
    preview.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent shrink-0"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>' +
      '<span class="text-xs text-secondary truncate flex-1">' + escapeHTML(name) + ' (' + formatFileSize(size) + ')</span>' +
      '<button type="button" id="chat-remove-attachment" class="text-muted hover:text-red-400 transition-colors">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>' +
      '</button>';

    document.getElementById("chat-remove-attachment").addEventListener("click", function () {
      pendingAttachment = null;
      preview.className = "hidden px-4 py-2 border-t border-border bg-primary/30 shrink-0";
      preview.innerHTML = "";
    });
  }

  // ── Send message ──
  function sendMessage(text) {
    if (state.sending) return;
    var message = (text || "").trim();
    if (!message && !pendingAttachment) return;

    state.sending = true;
    updateSendBtn();
    hideEmptyState();

    // Render user message immediately
    var userMsg = {
      role: "user",
      content: message || (pendingAttachment ? "Arquivo: " + pendingAttachment.name : ""),
      timestamp: new Date().toISOString(),
    };
    renderMessage(userMsg);
    scrollToBottom(true);

    // Build payload
    var payload = { message: message };
    if (state.activeSessionId) {
      payload.session_id = state.activeSessionId;
    }
    var vehicleVal = vehicleSelect ? vehicleSelect.value : "";
    if (vehicleVal) {
      payload.vehicle_id = parseInt(vehicleVal, 10);
    }
    if (pendingAttachment) {
      payload.attachment = {
        name: pendingAttachment.name,
        type: pendingAttachment.type,
        data: pendingAttachment.data,
      };
    }

    // Clear input
    textareaEl.value = "";
    autoResize();
    updateSendBtn();
    pendingAttachment = null;
    var previewEl = document.getElementById("chat-attachment-preview");
    if (previewEl) {
      previewEl.className = "hidden px-4 py-2 border-t border-border bg-primary/30 shrink-0";
      previewEl.innerHTML = "";
    }

    showTyping();

    // Send via fetch to support streaming if available
    var token = localStorage.getItem("autoassist_access_token");
    var headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;

    fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: headers,
      credentials: "include",
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (body) {
            throw new Error(body.error || "Erro ao enviar mensagem");
          });
        }
        // Check if response is SSE stream
        var ct = res.headers.get("content-type") || "";
        if (ct.indexOf("text/event-stream") !== -1) {
          return handleStreamingResponse(res);
        }
        return res.json();
      })
      .then(function (data) {
        hideTyping();
        if (!data) return;

        // data.response is the AI text; data.chat has the full record
        var aiMsg = {
          role: "assistant",
          content: data.response || data.text || "",
          timestamp: (data.chat && data.chat.created_at) || new Date().toISOString(),
          videos: data.videos || [],
          links: data.links || [],
        };
        renderMessage(aiMsg);
        scrollToBottom(true);

        // Update session
        if (data.chat) {
          if (!state.activeSessionId && data.chat.session_id) {
            state.activeSessionId = data.chat.session_id;
          }
          state.latestId = data.chat.id || state.latestId;
        }

        // Refresh conversations in background
        fetchConversations();
      })
      .catch(function (err) {
        hideTyping();
        console.error("[chat] send error:", err);
        var errMsg = {
          role: "assistant",
          content: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
          timestamp: new Date().toISOString(),
        };
        renderMessage(errMsg);
        scrollToBottom(true);
      })
      .finally(function () {
        state.sending = false;
        updateSendBtn();
      });
  }

  // ── Streaming response handler ──
  function handleStreamingResponse(res) {
    return new Promise(function (resolve) {
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";
      var aiContent = "";

      // Create a streaming message element
      var streamingMsg = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        videos: [],
        links: [],
      };
      var msgEl = renderMessage(streamingMsg);

      function read() {
        reader.read().then(function (result) {
          if (result.done) {
            resolve({ response: aiContent, chat: streamingMsg });
            return;
          }
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split("\n");
          buffer = lines.pop() || "";

          lines.forEach(function (line) {
            if (line.indexOf("data: ") !== 0) return;
            var jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") return;

            try {
              var chunk = JSON.parse(jsonStr);
              if (chunk.text) {
                aiContent += chunk.text;
                // Update streaming bubble
                if (msgEl) {
                  var bubble = msgEl.querySelector("div:last-child");
                  if (bubble) {
                    var contentHtml = nl2br(aiContent);
                    contentHtml = contentHtml.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
                    contentHtml = contentHtml.replace(/\*(.+?)\*/g, "<em>$1</em>");
                    // Preserve timestamp element
                    var timeEl = bubble.querySelector("div:last-child");
                    bubble.innerHTML = contentHtml;
                    if (timeEl) bubble.appendChild(timeEl);
                  }
                }
                scrollToBottom(true);
              }
              if (chunk.videos) streamingMsg.videos = chunk.videos;
              if (chunk.links) streamingMsg.links = chunk.links;
              if (chunk.chat) {
                streamingMsg.timestamp = chunk.chat.created_at || streamingMsg.timestamp;
              }
            } catch (_) {}
          });

          read();
        }).catch(function () {
          resolve({ response: aiContent, chat: streamingMsg });
        });
      }

      read();
    });
  }

  // ── Fetch data ──
  function fetchConversations() {
    return window.api
      .get(CONVERSATIONS_ENDPOINT)
      .then(function (data) {
        state.conversations = data.conversations || [];
        renderConversations();
      })
      .catch(function (err) {
        console.error("[chat] fetch conversations error:", err);
      });
  }

  function fetchChatHistory(sessionId) {
    messagesEl.innerHTML = "";
    state.messages = [];

    showTyping();

    var params = [];
    if (sessionId) {
      params.push("session_id=" + encodeURIComponent(sessionId));
    }
    params.push("limit=100");

    var url = HISTORY_ENDPOINT + "?" + params.join("&");

    window.api
      .get(url)
      .then(function (data) {
        hideTyping();
        var chats = data.chats || [];
        state.messages = [];
        state.latestId = data.latest_id || 0;

        if (chats.length === 0) {
          renderEmptyState();
          return;
        }

        chats.forEach(function (chat) {
          if (chat.mensagem_usuario) {
            state.messages.push({
              role: "user",
              content: chat.mensagem_usuario,
              timestamp: chat.created_at,
            });
          }
          if (chat.resposta_ia) {
            state.messages.push({
              role: "assistant",
              content: chat.resposta_ia,
              timestamp: chat.created_at,
              videos: chat.videos || [],
              links: chat.links || [],
            });
          }
        });

        state.messages.forEach(function (msg) {
          renderMessage(msg);
        });

        scrollToBottom(false);
      })
      .catch(function (err) {
        hideTyping();
        console.error("[chat] fetch history error:", err);
        renderEmptyState();
      });
  }

  function fetchVehicles() {
    return window.api
      .get(VEICULOS_ENDPOINT)
      .then(function (data) {
        state.vehicles = data.veiculos || [];
        populateVehicleOptions();
      })
      .catch(function (err) {
        console.error("[chat] fetch vehicles error:", err);
      });
  }

  function deleteSession(sessionId) {
    if (!confirm("Excluir toda esta conversa?")) return;
    var endpoint = sessionId ? "/api/chat/session/" + sessionId : "/api/chat/session/null";
    window.api
      .delete(endpoint)
      .then(function () {
        if (state.activeSessionId === sessionId) {
          state.activeSessionId = null;
          messagesEl.innerHTML = "";
          renderEmptyState();
          updateSessionLabel("Nova conversa");
        }
        fetchConversations();
      })
      .catch(function (err) {
        console.error("[chat] delete session error:", err);
        alert("Erro ao excluir conversa");
      });
  }

  // ── Event listeners ──
  function bindEvents() {
    // Textarea auto-resize + Enter to send
    textareaEl.addEventListener("input", function () {
      autoResize();
      updateSendBtn();
    });

    textareaEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(textareaEl.value);
      }
    });

    // Send button
    sendBtn.addEventListener("click", function () {
      sendMessage(textareaEl.value);
    });

    // File input
    fileInput.addEventListener("change", handleFileSelect);

    // New conversation button
    var newBtn = document.getElementById("chat-new-btn");
    if (newBtn) {
      newBtn.addEventListener("click", function () {
        state.activeSessionId = null;
        messagesEl.innerHTML = "";
        renderEmptyState();
        updateSessionLabel("Nova conversa");
        renderConversations();
      });
    }

    // Search conversations
    var searchInput = document.getElementById("chat-search-input");
    if (searchInput) {
      var debounceTimer = null;
      searchInput.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          var query = searchInput.value.trim().toLowerCase();
          if (!query) {
            renderConversations();
            return;
          }
          // Filter locally
          var filtered = state.conversations.filter(function (c) {
            return (c.title || "").toLowerCase().indexOf(query) !== -1 ||
                   (c.preview || "").toLowerCase().indexOf(query) !== -1;
          });
          var temp = conversationsList.innerHTML;
          if (filtered.length === 0) {
            conversationsList.innerHTML = '<div class="px-4 py-8 text-center text-sm text-muted">Nenhum resultado</div>';
          } else {
            conversationsList.innerHTML = "";
            filtered.forEach(function (conv) {
              var item = document.createElement("button");
              item.type = "button";
              item.className = "w-full text-left px-4 py-3 border-b border-border transition-colors hover:bg-white/5";
              item.innerHTML =
                '<p class="text-sm font-medium text-primary truncate">' + escapeHTML(conv.title || "Nova conversa") + '</p>' +
                '<p class="text-xs text-muted truncate mt-0.5">' + escapeHTML(conv.preview || "") + '</p>';
              item.addEventListener("click", function () {
                state.activeSessionId = conv.session_id || null;
                fetchChatHistory(conv.session_id);
                updateSessionLabel(conv.title);
              });
              conversationsList.appendChild(item);
            });
          }
        }, 200);
      });
    }
  }

  // ── Init ──
  document.addEventListener("DOMContentLoaded", function () {
    if (!auth.requireAuth()) return;

    buildUI();
    bindEvents();
    renderEmptyState();

    fetchVehicles().then(function () {
      return fetchConversations();
    }).then(function () {
      // Show empty state for new conversation
      if (!state.activeSessionId) {
        renderEmptyState();
      }
    });
  });
})();
