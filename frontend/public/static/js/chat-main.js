const messagesDiv = document.getElementById("messages");
      const input = document.getElementById("messageInput");
      const fileInput = document.getElementById("fileInput");
      const attachBtn = document.getElementById("attach");
      const sendBtn = document.getElementById("send");
      const btnMyVideos = document.getElementById("btnMyVideos");
      const btnReport = document.getElementById("btnReport");
      const btnReportChat = document.getElementById("btnReportChat");
      const btnVoice = document.getElementById("btnVoice");
      const btnSidebar = document.getElementById("btnSidebar");
      const btnNewChat = document.getElementById("btnNewChat");
      const btnSearchChats = document.getElementById("btnSearchChats");
      const sidebarOverlay = document.getElementById("sidebarOverlay");
      const sidebarSearch = document.getElementById("sidebarSearch");
      const chatHistorySearch = document.getElementById("chatHistorySearch");
      const chatHistoryList = document.getElementById("chatHistoryList");
      const notifBellContainer = document.getElementById("notif-bell-container");
      const navDashboard = document.getElementById("navDashboard");
      const navMaintenance = document.getElementById("navMaintenance");
      const navProfile = document.getElementById("navProfile");
      const navLogin = document.getElementById("navLogin");
      const navSignup = document.getElementById("navSignup");
      const logoutBtn = document.getElementById("logout");
      const guestNotice = document.getElementById("guestNotice");
      const guestRemaining = document.getElementById("guestRemaining");

      const FREE_GUEST_MESSAGE_LIMIT = 5;
      const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
      const GUEST_ID_KEY = "autoassist_guest_id";
      const GUEST_MESSAGE_COUNT_KEY = "autoassist_guest_message_count";
      const AUTH_HISTORY_CACHE_PREFIX = "autoassist_chat_history_cache_v2";
      const GUEST_HISTORY_CACHE_KEY = "autoassist_guest_chat_history_cache_v1";
      const CHAT_USE_WEBSOCKET = true;

      const supportedAttachmentTypes = new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",
        "text/plain",
        "text/csv",
        "text/markdown",
        "application/json",
      ]);
      const supportedAttachmentExtensions = new Set(["txt", "md", "csv", "json", "pdf"]);

      const isAuthenticated = typeof Auth !== "undefined" && Auth.isAuthenticated();
      const currentUser = isAuthenticated && typeof Auth !== "undefined" ? Auth.getUser() : null;
      const guestId = isAuthenticated ? null : getGuestId();
      const GUEST_TURNSTILE_KEY = "autoassist_turnstile_token";
      const guestTurnstileToken = isAuthenticated ? null : sessionStorage.getItem(GUEST_TURNSTILE_KEY);

      // Visitante sem desafio Turnstile resolvido: encaminha para o portão de
      // verificação e retorna para o chat após confirmar.
      if (!isAuthenticated && !guestTurnstileToken) {
        window.location.replace("verificacao.html?next=" + encodeURIComponent("chat.html"));
        throw new Error("gate-redirect");
      }
      let lastAnalysisText = "";
      let isVoiceActive = false;
      let chatHistoryItems = [];
      let activeHistoryKey = null;
      let currentThreadHistory = [];
      let userLat = null;
      let userLng = null;
      let currentVehicleId = "";

      // Obtém localização do usuário para contexto de mecânicos no chat
      const saved = localStorage.getItem("autoassist_location");
      if (saved) {
        try {
          const loc = JSON.parse(saved);
          const age = Date.now() - (loc.ts || 0);
          if (age < 3600000) { // 1h de validade
            userLat = loc.lat;
            userLng = loc.lng;
          }
        } catch {}
      }
      if (userLat === null && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            userLat = pos.coords.latitude;
            userLng = pos.coords.longitude;
            localStorage.setItem("autoassist_location", JSON.stringify({
              lat: userLat, lng: userLng, ts: Date.now()
            }));
          },
          () => {},
          { timeout: 5000, enableHighAccuracy: false }
        );
      }

      // Seletor de veículo para diagnóstico visual assistido (memória visual)
      (function loadChatVehicles() {
        if (!isAuthenticated || typeof Auth === "undefined" || !Auth.authenticatedFetch) return;
        const bar = document.getElementById("chatVehicleBar");
        const sel = document.getElementById("chatVehicle");
        if (!bar || !sel) return;
        Auth.authenticatedFetch("/api/veiculos")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            const veiculos = (data && data.veiculos) || [];
            if (!veiculos.length) return;
            veiculos.forEach((v) => {
              const label = [v.marca, v.modelo, v.ano_fabricacao].filter(Boolean).join(" ") || ("Veículo #" + v.id);
              const opt = document.createElement("option");
              opt.value = v.id;
              opt.textContent = label;
              sel.appendChild(opt);
            });
            bar.style.display = "flex";
            sel.addEventListener("change", () => { currentVehicleId = sel.value || ""; });
          })
          .catch(() => {});
      })();

      configureAccessControls();
      updateGuestNotice();

      // Re-aplica após syncUser() completar para capturar is_premium fresco
      if (isAuthenticated && typeof Auth !== "undefined" && Auth.syncUser) {
        Auth.syncUser().then(() => configureAccessControls());
      }

      function getGuestId() {
        const stored = localStorage.getItem(GUEST_ID_KEY);
        if (stored) return stored;

        const generated = window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(GUEST_ID_KEY, generated);
        return generated;
      }

      function getGuestMessageCount() {
        return Number(localStorage.getItem(GUEST_MESSAGE_COUNT_KEY) || "0");
      }

      function setGuestMessageCount(value) {
        localStorage.setItem(GUEST_MESSAGE_COUNT_KEY, String(Math.max(0, value)));
        updateGuestNotice();
      }

      function updateGuestNotice() {
        if (!guestNotice || !guestRemaining) return;
        if (isAuthenticated) {
          guestNotice.hidden = true;
          return;
        }

        const remaining = Math.max(0, FREE_GUEST_MESSAGE_LIMIT - getGuestMessageCount());
        guestRemaining.textContent = String(remaining);
        guestNotice.hidden = false;
      }

      function configureAccessControls() {
        if (isAuthenticated) {
          if (navLogin) navLogin.style.display = "none";
          if (navSignup) navSignup.style.display = "none";
          if (navMaintenance) navMaintenance.style.display = "inline-flex";
          if (navProfile) navProfile.style.display = "inline-flex";
          if (logoutBtn) logoutBtn.style.display = "inline-flex";
          btnReport.style.display = "inline-flex";
          if (navDashboard) navDashboard.style.display = "inline-flex";
          if (btnMyVideos) btnMyVideos.style.display = "inline-flex";
          if (notifBellContainer) notifBellContainer.style.display = "inline-flex";
          return;
        }

        if (navDashboard) navDashboard.style.display = "none";
        if (btnMyVideos) btnMyVideos.style.display = "none";
        if (notifBellContainer) notifBellContainer.style.display = "none";
        if (navMaintenance) navMaintenance.style.display = "none";
        if (navProfile) navProfile.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "none";
        btnReport.style.display = "none";
        if (navLogin) navLogin.style.display = "inline-flex";
        if (navSignup) navSignup.style.display = "inline-flex";
      }

      // Voice support: o fluxo usa MediaRecorder/getUserMedia, nao Web Speech.
      const supportsVoiceInput = Boolean(
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia &&
        window.MediaRecorder &&
        (window.AudioContext || window.webkitAudioContext)
      );

      if (!supportsVoiceInput) {
        btnVoice.disabled = true;
        btnVoice.title = "Voz indisponivel neste navegador ou conexao.";
        btnVoice.setAttribute("aria-label", "Voz indisponivel");
      }

      // Voice handlers
      let mediaRecorder = null;
      let audioChunks = [];
      let isHandsFreeActive = false;
      let silenceTimeout = null;
      let audioContext = null;
      let analyser = null;
      let microphone = null;
      let streamGlobal = null;
      let hasDetectedSoundInSegment = false;

      btnVoice.addEventListener("click", async () => {
        if (!supportsVoiceInput) {
          input.placeholder = "Voz indisponivel neste navegador.";
          return;
        }

        if (!canGuestSendMessage()) {
          showGuestLimitPrompt();
          return;
        }

        if (!isHandsFreeActive) {
          startHandsFree();
        } else {
          stopHandsFree();
        }
      });

      async function startHandsFree() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamGlobal = stream;
          isHandsFreeActive = true;
          btnVoice.classList.add("is-recording");
          
          setupSilenceDetection(stream);
          startRecordingSegment();
        } catch (err) {
          console.error("Mic error:", err);
          input.placeholder = "Sem acesso ao microfone.";
        }
      }

      function setupSilenceDetection(stream) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkSilence = () => {
          if (!isHandsFreeActive) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          let average = sum / bufferLength;

          if (average > 15) {
            hasDetectedSoundInSegment = true;
            if (silenceTimeout) {
              clearTimeout(silenceTimeout);
              silenceTimeout = null;
            }
          } else if (hasDetectedSoundInSegment) {
            if (!silenceTimeout) {
              silenceTimeout = setTimeout(() => {
                if (mediaRecorder && mediaRecorder.state === "recording") {
                  mediaRecorder.stop();
                }
              }, 5000);
            }
          }
          requestAnimationFrame(checkSilence);
        };
        checkSilence();
      }

      function startRecordingSegment() {
        if (!isHandsFreeActive) return;
        
        hasDetectedSoundInSegment = false;
        mediaRecorder = new MediaRecorder(streamGlobal);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          if (hasDetectedSoundInSegment && audioChunks.length > 0) {
            sendVoiceToBackend(audioBlob);
          }
          
          if (isHandsFreeActive) {
            startRecordingSegment();
          }
        };

        mediaRecorder.start();
        input.placeholder = "Ouvindo... Fale agora.";
      }

      function stopHandsFree() {
        isHandsFreeActive = false;
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
        if (streamGlobal) {
          streamGlobal.getTracks().forEach(track => track.stop());
        }
        if (audioContext) {
          audioContext.close();
        }
        if (silenceTimeout) {
          clearTimeout(silenceTimeout);
          silenceTimeout = null;
        }
        btnVoice.classList.remove("is-recording");
        input.placeholder = "Pergunte sobre seu veículo...";
      }

      async function sendVoiceToBackend(blob) {
        const formData = new FormData();
        formData.append("audio", blob, "voice.webm");
        formData.append("ignore_global_history", "true");
        formData.append("client_history", JSON.stringify(currentThreadHistory));
        formData.append("session_id", currentSessionId);
        if (!isAuthenticated && guestId) formData.append("guest_id", guestId);
        if (guestTurnstileToken) formData.append("cf-turnstile-response", guestTurnstileToken);
        if (userLat !== null && userLng !== null) {
          formData.append("lat", userLat);
          formData.append("lng", userLng);
        }

        const file = fileInput.files[0];
        let attachmentPayload = null;
        if (file) {
          try {
            attachmentPayload = await buildAttachmentPayload(file);
            formData.append("attachment", JSON.stringify(attachmentPayload));
          } catch (err) {
            addMessage(`<strong>Erro:</strong> ${err.message}`, "msg-bot", true);
            return;
          }
          clearAttachmentPreview();
        }

        addMessage(
          file ? `Áudio enviado com arquivo anexado: ${file.name}` : "Áudio enviado",
          "msg-user",
          false,
          [],
          [],
          attachmentMetadataFromFile(file)
        );
        const typingDiv = addMessage(
          '<div class="typing-indicator"><span></span><span></span><span></span></div>',
          "msg-bot",
          true
        );

        try {
          const res = await chatApiFetch("/api/voice", {
            method: "POST",
            body: formData,
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.error) {
            if (String(data.error || "").indexOf("Verificação de segurança") !== -1) {
              window.location.replace("verificacao.html?next=" + encodeURIComponent("chat.html"));
              return;
            }
            if (data.code === "guest_limit_reached") {
              typingDiv.closest(".message-row")?.remove();
              setGuestMessageCount(FREE_GUEST_MESSAGE_LIMIT);
              showGuestLimitPrompt();
              return;
            }
            typingDiv.textContent = data.error || "Erro ao processar voz.";
            return;
          }

          const userMsgs = document.querySelectorAll(".msg-user");
          userMsgs[userMsgs.length - 1].textContent = data.text;

          const cleanHtml = DOMPurify.sanitize(marked.parse(data.response));
          typingDiv.innerHTML = cleanHtml;
          appendVideosToDiv(typingDiv, data.videos);
          appendLinksToDiv(typingDiv, data.links);
          lastAnalysisText = data.response;
          updateGuestUsageFromServer(data.guest_messages_remaining, data.guest_limit);
          appendToCurrentThread(data.chat?.mensagem_usuario || data.text, data.response);
          addChatToHistory(data.chat || {
            mensagem_usuario: data.text,
            resposta_ia: data.response,
            created_at: new Date().toISOString(),
            videos: data.videos || [],
            links: data.links || [],
            topic: "",
            attachments: attachmentMetadataFromFile(file),
          });
        } catch (err) {
          typingDiv.textContent = "Erro ao processar voz.";
        }
        scrollToBottom();
      }

      function appendVideosToDiv(div, videos) {
        if (videos && videos.length > 0) {
          const vContainer = document.createElement("div");
          vContainer.className = "videos-container";
          
          videos.forEach(v => {
            const vCard = document.createElement("div");
            vCard.className = "video-card";
            
            // Sanitização básica para atributos
            const safeUrl = (v.url || "").replace(/"/g, '&quot;');
            const safeThumb = (v.thumbnail || "").replace(/"/g, '&quot;');
            const safeTitleAttr = (v.titulo || "").replace(/"/g, '&quot;');
            
            vCard.innerHTML = `
              <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="video-play-area">
                <div class="play-icon-wrapper">
                    <i class="fas fa-play"></i>
                </div>
              </a>
              <div class="video-info">
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                  <div class="video-title" title="${safeTitleAttr}"></div>
                </a>
              </div>
            `;
            // Usar textContent para o título
            const titleDiv = vCard.querySelector('.video-title');
            if (titleDiv) titleDiv.textContent = v.titulo || "";
            
            vContainer.appendChild(vCard);
          });
          div.appendChild(vContainer);
          scrollToBottom();
        }
      }

      // Chat Logic
      const scrollToBottom = () => {
        setTimeout(() => {
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }, 100);
      };

      function formatBytes(bytes = 0) {
        if (!bytes) return "0 KB";
        if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      }

      function getFileExtension(file) {
        return (file.name.split(".").pop() || "").toLowerCase();
      }

      function getAttachmentType(file) {
        if (file.type === "text/x-markdown") return "text/markdown";
        if (file.type) return file.type;
        const extension = getFileExtension(file);
        if (extension === "md") return "text/markdown";
        if (extension === "txt") return "text/plain";
        if (extension === "csv") return "text/csv";
        if (extension === "json") return "application/json";
        if (extension === "pdf") return "application/pdf";
        return "";
      }

      function isSupportedAttachment(file) {
        const type = getAttachmentType(file);
        return supportedAttachmentTypes.has(type) || supportedAttachmentExtensions.has(getFileExtension(file));
      }

      function getAttachmentIcon(type) {
        if (type.startsWith("image/")) return "fas fa-image";
        if (type === "application/pdf") return "fas fa-file-pdf";
        if (type.includes("json")) return "fas fa-code";
        if (type.includes("csv")) return "fas fa-table";
        return "fas fa-file-lines";
      }

      function attachmentMetadataFromFile(file) {
        if (!file) return [];
        const type = getAttachmentType(file);
        return [{ name: file.name, type, size: file.size }];
      }

      function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
          reader.readAsDataURL(file);
        });
      }

      async function buildAttachmentPayload(file) {
        if (!file) return null;
        if (file.size > MAX_ATTACHMENT_BYTES) {
          throw new Error("O arquivo anexado deve ter no máximo 8 MB.");
        }
        if (!isSupportedAttachment(file)) {
          throw new Error("Formato não suportado. Envie imagem, PDF, TXT, CSV, Markdown ou JSON.");
        }

        return {
          name: file.name,
          type: getAttachmentType(file),
          size: file.size,
          data: await readFileAsDataURL(file),
        };
      }

      function clearAttachmentPreview() {
        fileInput.value = "";
        const container = document.getElementById("imagePreviewContainer");
        container.style.display = "none";
        container.innerHTML = "";
      }

      function updateGuestUsageFromServer(remaining, limit = FREE_GUEST_MESSAGE_LIMIT) {
        if (isAuthenticated || typeof remaining !== "number") return;
        setGuestMessageCount(Math.max(0, limit - remaining));
      }

      function canGuestSendMessage() {
        return isAuthenticated || getGuestMessageCount() < FREE_GUEST_MESSAGE_LIMIT;
      }

      function showGuestLimitPrompt() {
        const html = `
          <p>Você usou suas 5 mensagens grátis de visitante.</p>
          <p><a href="cadastro.html">Criar conta grátis</a> para continuar com 30 consultas por mês, ou <a href="login.html">entrar</a>.</p>
        `;
        addMessage(html, "msg-bot", true);
        updateGuestNotice();
      }

      // WebSocket support
      let wsChat = null;
      let wsReconnectTimer = null;

      function handleWebSocketResponse(data) {
        const typingDiv = document.getElementById("typing");
        const botResponse = data.resposta_ia || "Desculpe, não consegui processar.";
        lastAnalysisText = botResponse;

        const cleanHtml = DOMPurify.sanitize(marked.parse(botResponse));
        if (typingDiv) {
          typingDiv.innerHTML = cleanHtml;
          appendVideosToDiv(typingDiv, data.videos || []);
          appendLinksToDiv(typingDiv, data.links || []);
          typingDiv.id = "";
        }
        appendToCurrentThread(data.mensagem_usuario || "", botResponse);
        addChatToHistory(data.chat || {
          id: data.id || null,
          mensagem_usuario: data.mensagem_usuario || "",
          resposta_ia: botResponse,
          created_at: data.created_at || new Date().toISOString(),
          videos: data.videos || [],
          links: data.links || [],
          topic: data.topic || "",
        });
        scrollToBottom();
      }

      function initWebSocketChat() {
        if (!CHAT_USE_WEBSOCKET) return;

        function connectWebSocket() {
          const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
          const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
          wsChat = new WebSocket(wsUrl);

          wsChat.onopen = () => {
            if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
            // Envia autenticacao como primeiro frame (evita token na URL/logs)
            const authMsg = { type: "auth", session_id: currentSessionId };
            if (isAuthenticated) {
              const accessToken = (typeof Auth !== "undefined" && Auth.getAccessToken) ? Auth.getAccessToken() : null;
              if (accessToken) authMsg.token = accessToken;
            } else if (guestId) {
              authMsg.guest_id = guestId;
              if (guestTurnstileToken) authMsg.turnstile_token = guestTurnstileToken;
            }
            wsChat.send(JSON.stringify(authMsg));
          };

          wsChat.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "status") {
              // Status update, ignore
            } else if (data.type === "response") {
              handleWebSocketResponse(data);
            } else if (data.error) {
              if (String(data.error).indexOf("Verificação de segurança") !== -1) {
                window.location.replace("verificacao.html?next=" + encodeURIComponent("chat.html"));
                return;
              }
              const typingDiv = document.getElementById("typing");
              if (typingDiv) {
                if (typeof SecurityUtils !== "undefined" && SecurityUtils.setSafeText) {
                  SecurityUtils.setSafeText(typingDiv, data.error || "", "Erro: ");
                } else {
                  typingDiv.textContent = "Erro: " + (data.error || "");
                }
                typingDiv.id = "";
              }
            }
          };

          wsChat.onclose = () => {
            if (!wsReconnectTimer) {
              wsReconnectTimer = setTimeout(() => connectWebSocket(), 5000);
            }
          };
        }

        connectWebSocket();
      }

      async function chatApiFetch(endpoint, options = {}) {
        const headers = { ...(options.headers || {}) };
        if (!isAuthenticated && guestId) headers["X-AutoAssist-Guest-Id"] = guestId;
        if (guestTurnstileToken) headers["X-Turnstile-Token"] = guestTurnstileToken;

        if (typeof Auth !== "undefined" && Auth.optionalFetch) {
          return Auth.optionalFetch(endpoint, { ...options, headers });
        }

        return fetch(`${CONFIG.API_URL}${endpoint}`, {
          ...options,
          credentials: "include",
          headers,
        });
      }

      const normalizeHistoryText = (value = "") =>
        String(value)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();

      const genericChatTokens = new Set([
        "ai",
        "bem",
        "boa",
        "bom",
        "dia",
        "e",
        "noite",
        "obrigada",
        "obrigado",
        "oi",
        "ola",
        "opa",
        "salve",
        "tarde",
        "tudo",
        "valeu",
      ]);

      const isGenericHistoryMessage = (value = "") => {
        const tokens = normalizeHistoryText(value).match(/[a-z0-9]+/g) || [];
        return tokens.length > 0 && tokens.length <= 5 && tokens.every((token) => genericChatTokens.has(token));
      };

      const makeHistoryKey = (chat, index) =>
        String(chat.id || `${chat.created_at || "chat"}-${index}`);

      const getHistoryTitle = (chat) => {
        const topic = (chat.topic || "").trim();
        const message = (chat.mensagem_usuario || "").trim();
        if (topic && normalizeHistoryText(topic) !== "consultoria geral") return topic;
        return message || "Conversa sem título";
      };

      const formatHistoryDate = (value) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      function getHistoryCacheKey() {
        if (!isAuthenticated) return GUEST_HISTORY_CACHE_KEY;
        return `${AUTH_HISTORY_CACHE_PREFIX}:${currentUser?.id || "session"}`;
      }

      function readChatHistoryCache() {
        try {
          const cached = JSON.parse(localStorage.getItem(getHistoryCacheKey()) || "null");
          if (Array.isArray(cached)) return cached;
          if (Array.isArray(cached?.items)) return cached.items;
        } catch {
          return [];
        }
        return [];
      }

      function generateUUID() {
        return crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).substr(2, 9);
      }
      let currentSessionId = generateUUID();

      function writeChatHistoryCache(items) {
        localStorage.setItem(getHistoryCacheKey(), JSON.stringify({
          ts: Date.now(),
          items: Array.isArray(items) ? items : [],
        }));
      }

      function getLatestHistoryId(items = chatHistoryItems) {
        return items.reduce((latest, chat) => Math.max(latest, Number(chat.id || 0)), 0);
      }

      function mergeChatHistory(existingItems, newItems) {
        const merged = new Map();
        [...existingItems, ...newItems].forEach((chat) => {
          const key = chat.id
            ? `id:${chat.id}`
            : `local:${chat.session_id || ""}:${chat.created_at}:${chat.mensagem_usuario}`;
          merged.set(key, chat);
        });

        return Array.from(merged.values()).sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateA - dateB;
        });
      }

      function getChatSessionId(chat, index = 0) {
        const sessionId = String(chat?.session_id || "").trim();
        if (sessionId) return sessionId;
        return `legacy-${chat?.id || chat?.created_at || index}`;
      }

      function groupChatHistory(items = chatHistoryItems) {
        const grouped = new Map();
        [...items]
          .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
          .forEach((chat, index) => {
            const sid = getChatSessionId(chat, index);
            if (!chat.session_id) chat.session_id = sid;

            if (!grouped.has(sid)) {
              grouped.set(sid, {
                session_id: sid,
                topic: chat.topic || "Novo Chat",
                created_at: chat.created_at,
                firstMessage: chat.mensagem_usuario,
                messages: [],
              });
            }

            const group = grouped.get(sid);
            group.messages.push(chat);
            if (chat.topic && chat.topic !== "Novo Chat") group.topic = chat.topic;
          });
        return grouped;
      }

      function setSidebarOpen(open) {
        document.body.classList.toggle("sidebar-open", open);
        btnSidebar?.setAttribute("aria-expanded", String(open));
      }

      function renderHistoryList() {
        if (!chatHistoryList) return;
        const query = normalizeHistoryText(chatHistorySearch?.value || "");

        const grouped = groupChatHistory(chatHistoryItems);

        const items = Array.from(grouped.values())
          .reverse()
          .filter((group) => {
            if (!query) return true;
            return group.messages.some(m => normalizeHistoryText([
              m.topic,
              m.mensagem_usuario,
              m.resposta_ia,
            ].join(" ")).includes(query));
          });

        chatHistoryList.innerHTML = "";
        if (items.length === 0) {
          const empty = document.createElement("li");
          empty.style.cssText = "text-align: center; color: var(--text-secondary); padding: 1rem;";
          empty.textContent = "Nenhum histórico encontrado.";
          chatHistoryList.appendChild(empty);
          return;
        }

        items.forEach((group) => {
          const row = document.createElement("div");
          row.className = `history-chat-row${activeHistoryKey === group.session_id ? " is-active" : ""}`;

          const button = document.createElement("button");
          button.type = "button";
          button.className = "history-chat-item";
          button.title = formatHistoryDate(group.created_at);

          const title = document.createElement("span");
          title.className = "history-chat-title";
          title.textContent = group.topic && group.topic !== "Novo Chat" ? group.topic : (group.firstMessage || "Arquivo Anexado");

          button.appendChild(title);
          button.addEventListener("click", () => renderSession(group));

          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "history-delete-btn";
          deleteButton.title = "Excluir chat";
          deleteButton.setAttribute("aria-label", `Excluir chat`);
          deleteButton.innerHTML = '<i class="fas fa-trash-alt" aria-hidden="true"></i>';
          deleteButton.addEventListener("click", async (event) => {
            event.stopPropagation();
            await deleteChatHistoryBySession(group.session_id, deleteButton);
          });

          row.appendChild(button);
          row.appendChild(deleteButton);
          chatHistoryList.appendChild(row);
        });
      }

      async function renderSession(group, options = {}) {
        messagesDiv.innerHTML = "";
        currentSessionId = group.session_id;
        activeHistoryKey = group.session_id;

        currentThreadHistory = [];
        lastAnalysisText = "";

        let messages = group.messages;
        if (isAuthenticated && typeof Auth !== "undefined" && group.session_id) {
          try {
            const res = await Auth.authenticatedFetch(
              `/api/chat/history?session_id=${encodeURIComponent(group.session_id)}&limit=200`,
              { redirectOnInvalid: false }
            );
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.chats) && data.chats.length) messages = data.chats;
            }
          } catch (e) {
            console.warn("Erro ao carregar mensagens da sessão:", e);
          }
        }

        messages.forEach(chat => {
          renderChatEntry(chat);
          appendToCurrentThread(chat.mensagem_usuario, chat.resposta_ia);
          lastAnalysisText = chat.resposta_ia || "";
        });

        renderHistoryList();
        if (options.closeSidebar !== false) setSidebarOpen(false);
        scrollToBottom();
      }

      async function deleteChatHistoryBySession(sessionId, button) {
          button.disabled = true;
          try {
             const messagesToDelete = chatHistoryItems.filter(c => getChatSessionId(c) === sessionId);
             for(let m of messagesToDelete) {
                if(m.id && isAuthenticated && typeof Auth !== "undefined") {
                    await Auth.authenticatedFetch(`/api/chat/history/${encodeURIComponent(m.id)}`, { method: "DELETE" }).catch(() => {});
                }
             }
             chatHistoryItems = chatHistoryItems.filter(c => getChatSessionId(c) !== sessionId);
             if (activeHistoryKey === sessionId) {
                 const remainingGroups = Array.from(groupChatHistory(chatHistoryItems).values());
                 const latestGroup = remainingGroups[remainingGroups.length - 1];
                 if (latestGroup) {
                   renderSession(latestGroup, { closeSidebar: false });
                 } else {
                   activeHistoryKey = null;
                   currentThreadHistory = [];
                   messagesDiv.innerHTML = "";
                   lastAnalysisText = "";
                   currentSessionId = generateUUID();
                 }
             }
             writeChatHistoryCache(chatHistoryItems);
             renderHistoryList();
          } catch(e) {
             console.warn("Erro ao excluir chat:", e);
             alert("Não foi possível excluir este chat.");
             button.disabled = false;
          }
      }

      function renderChatEntry(chat) {
        addMessage(chat.mensagem_usuario || "Arquivo anexado", "msg-user", false, [], [], chat.attachments || []);

        let cleanHtml = "";
        try {
          const rawHtml = marked.parse(chat.resposta_ia || "");
          cleanHtml = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawHtml) : rawHtml;
        } catch (e) {
          cleanHtml = "Erro ao renderizar mensagem.";
        }

        const showAttachments = !isGenericHistoryMessage(chat.mensagem_usuario);
        addMessage(
          cleanHtml,
          "msg-bot",
          true,
          showAttachments ? chat.videos : [],
          showAttachments ? chat.links : []
        );
      }

      function historyFromChat(chat) {
        const history = [];
        const userMessage = (chat?.mensagem_usuario || "").trim();
        const assistantMessage = (chat?.resposta_ia || "").trim();
        if (userMessage) history.push({ role: "user", content: userMessage });
        if (assistantMessage) history.push({ role: "model", content: assistantMessage });
        return history;
      }

      function appendToCurrentThread(userMessage, assistantMessage) {
        if (userMessage) currentThreadHistory.push({ role: "user", content: userMessage });
        if (assistantMessage) currentThreadHistory.push({ role: "model", content: assistantMessage });
        currentThreadHistory = currentThreadHistory.slice(-8);
      }

      function addChatToHistory(chat) {
        if (!chat) return;
        if (!chat.session_id) chat.session_id = currentSessionId;
        currentSessionId = chat.session_id;
        chatHistoryItems = [...chatHistoryItems, chat];
        activeHistoryKey = chat.session_id;
        writeChatHistoryCache(chatHistoryItems);
        renderHistoryList();
      }

    function appendLinksToDiv(div, links) {
        if (links && links.length > 0) {
            const lContainer = document.createElement("div");
            lContainer.className = "links-container";
            
            links.forEach(l => {
                const a = document.createElement("a");
                a.className = "recommendation-link";
                a.href = l.url;
                a.target = "_blank";
                a.rel = "noopener noreferrer";
                const icon = document.createElement("i");
                icon.className = l.icon || "fas fa-external-link-alt";
                const label = document.createElement("span");
                label.textContent = l.titulo || "Abrir link";
                a.appendChild(icon);
                a.appendChild(label);
                lContainer.appendChild(a);
            });
            div.appendChild(lContainer);
            scrollToBottom();
        }
    }

    function appendAttachmentsToDiv(div, attachments = []) {
        if (!attachments.length) return;

        const container = document.createElement("div");
        container.className = "links-container";
        attachments.forEach((attachment) => {
          const type = attachment.type || "";
          const chip = document.createElement("div");
          chip.className = "recommendation-link";

          const icon = document.createElement("i");
          icon.className = getAttachmentIcon(type);

          const label = document.createElement("span");
          label.textContent = `${attachment.name || "Arquivo"} (${formatBytes(Number(attachment.size || 0))})`;

          chip.appendChild(icon);
          chip.appendChild(label);
          container.appendChild(chip);
        });

        div.appendChild(container);
        scrollToBottom();
    }

    function addMessage(text, cls, isHtml = false, videos = [], links = [], attachments = []) {
        const isUser = cls.includes("msg-user");
        const isBot = cls.includes("msg-bot");
        const row = document.createElement("div");
        row.className = `message-row ${isUser ? "message-row-user" : "message-row-bot"}`;

        if (isBot) {
          const avatar = document.createElement("div");
          avatar.className = "message-avatar";
          avatar.setAttribute("aria-hidden", "true");

          const avatarImg = document.createElement("img");
          avatarImg.src = "static/logo2.png?v=20260506";
          avatarImg.alt = "";
          avatar.appendChild(avatarImg);
          row.appendChild(avatar);
        }

        const stack = document.createElement("div");
        stack.className = "message-stack";

        const meta = document.createElement("div");
        meta.className = "message-meta";
        meta.textContent = isUser ? "Você" : "AutoAssist";

        const div = document.createElement("div");
        div.className = cls;
        if (isHtml) {
          div.innerHTML = text;
        } else {
          div.textContent = text;
        }
        stack.appendChild(meta);
        stack.appendChild(div);
        row.appendChild(stack);
        messagesDiv.appendChild(row);
        
        appendVideosToDiv(div, videos);
        appendLinksToDiv(div, links);
        appendAttachmentsToDiv(div, attachments);
        
        scrollToBottom();
        return div;
    }

      function isMechanicQuery(text) {
        const kw = ["mecanic", "oficina", "borracheiro", "funileiro",
                     "reparo", "consertar", "arrumar", "troca de oleo",
                     "troque oleo", "trocar oleo", "alinhamento",
                     "balanceamento", "revisao"];
        const normalized = normalizeHistoryText(text);
        return kw.some(k => normalized.includes(k));
      }

      async function waitForLocation(timeout = 7000) {
        if (userLat !== null && userLng !== null) return;
        if (!navigator.geolocation) return;
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { userLat = pos.coords.latitude; userLng = pos.coords.longitude; resolve(); },
            () => resolve(),
            { timeout, enableHighAccuracy: false }
          );
        });
      }

      const sendMessage = async () => {
        const msg = input.value.trim();
        const file = fileInput.files[0];
        if (!msg && !file) return;

        if (!canGuestSendMessage()) {
          showGuestLimitPrompt();
          return;
        }

        if (isMechanicQuery(msg)) {
          await waitForLocation();
        }

        let attachmentPayload = null;
        try {
          attachmentPayload = await buildAttachmentPayload(file);
        } catch (err) {
          addMessage(`<strong>Erro:</strong> ${err.message}`, "msg-bot", true);
          return;
        }

        const attachmentLabel = file ? `Arquivo anexado: ${file.name}` : "";
        const userMessageText = msg || attachmentLabel;
        addMessage(
          `${userMessageText}${file && msg ? ` [${attachmentLabel}]` : ""}`,
          "msg-user",
          false,
          [],
          [],
          attachmentMetadataFromFile(file)
        );

        input.value = "";
        clearAttachmentPreview();

        const typingDiv = addMessage(
          '<div class="typing-indicator"><span></span><span></span><span></span></div>',
          "msg-bot",
          true
        );
        typingDiv.id = "typing";

        try {
          let payload = {
            message: msg,
            category: "automotivo",
            ignore_global_history: true,
            client_history: currentThreadHistory,
            session_id: currentSessionId,
          };
          if (attachmentPayload) payload.attachment = attachmentPayload;
          if (currentVehicleId) payload.vehicle_id = currentVehicleId;
          if (!isAuthenticated && guestId) payload.guest_id = guestId;
          if (guestTurnstileToken) payload.turnstile_token = guestTurnstileToken;
          if (userLat !== null && userLng !== null) {
            payload.lat = userLat;
            payload.lng = userLng;
          }
          // P0.2: identidade anônima para atribuir uso de visitantes (pré-cadastro).
          if (window.AutoAssistAnalytics && window.AutoAssistAnalytics.getAnonymousId) {
            payload.anonymous_id = window.AutoAssistAnalytics.getAnonymousId();
          }

          if (CHAT_USE_WEBSOCKET && wsChat && wsChat.readyState === WebSocket.OPEN) {
            wsChat.send(JSON.stringify(payload));
          } else {
            const res = await chatApiFetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.error) {
              if (String(data.error || "").indexOf("Verificação de segurança") !== -1) {
                window.location.replace("verificacao.html?next=" + encodeURIComponent("chat.html"));
                return;
              }
              if (data.code === "guest_limit_reached") {
                typingDiv.closest(".message-row")?.remove();
                setGuestMessageCount(FREE_GUEST_MESSAGE_LIMIT);
                showGuestLimitPrompt();
                return;
              }
              throw new Error(data.error || "Não foi possível enviar a mensagem.");
            }

            const botResponse = data.response || data.text || "Desculpe, não consegui processar.";
            lastAnalysisText = botResponse;

            const cleanHtml = DOMPurify.sanitize(marked.parse(botResponse));
            typingDiv.innerHTML = cleanHtml;
            appendVideosToDiv(typingDiv, data.videos);
            appendLinksToDiv(typingDiv, data.links);
            typingDiv.id = "";
            updateGuestUsageFromServer(data.guest_messages_remaining, data.guest_limit);
            appendToCurrentThread(data.chat?.mensagem_usuario || userMessageText, botResponse);
            addChatToHistory(data.chat || {
              mensagem_usuario: userMessageText,
              resposta_ia: botResponse,
              created_at: new Date().toISOString(),
              videos: data.videos || [],
              links: data.links || [],
              topic: "",
              attachments: attachmentMetadataFromFile(file),
            });
          }
        } catch (err) {
          if (typeof SecurityUtils !== "undefined" && SecurityUtils.setSafeText) {
            SecurityUtils.setSafeText(typingDiv, err.message || "Falha na conexão.", "Erro: ");
          } else {
            typingDiv.textContent = "Erro: " + (err.message || "Falha na conexão.");
          }
        }
        scrollToBottom();
      };

      // Events
      sendBtn.addEventListener("click", sendMessage);
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
      });

      btnSidebar?.addEventListener("click", () => {
        setSidebarOpen(!document.body.classList.contains("sidebar-open"));
      });

      sidebarOverlay?.addEventListener("click", () => setSidebarOpen(false));

      function startNewChat() {
        activeHistoryKey = null;
        currentSessionId = generateUUID();
        currentThreadHistory = [];
        messagesDiv.innerHTML = "";
        lastAnalysisText = "";
        renderHistoryList();
        setSidebarOpen(false);
        input.focus();
      }

      btnNewChat?.addEventListener("click", startNewChat);

      btnSearchChats?.addEventListener("click", () => {
        const isOpen = sidebarSearch.classList.toggle("is-open");
        if (isOpen) {
          chatHistorySearch.focus();
        } else {
          chatHistorySearch.value = "";
          renderHistoryList();
        }
      });

      chatHistorySearch?.addEventListener("input", renderHistoryList);

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setSidebarOpen(false);
      });
      
      attachBtn.addEventListener("click", () => fileInput.click());
      
      fileInput.addEventListener("change", () => {
        const container = document.getElementById("imagePreviewContainer");
        const file = fileInput.files[0];
        if (!file) {
          clearAttachmentPreview();
          return;
        }

        if (file.size > MAX_ATTACHMENT_BYTES || !isSupportedAttachment(file)) {
          alert(file.size > MAX_ATTACHMENT_BYTES
            ? "O arquivo anexado deve ter no máximo 8 MB."
            : "Formato não suportado. Envie imagem, PDF, TXT, CSV, Markdown ou JSON.");
          clearAttachmentPreview();
          return;
        }

        const type = getAttachmentType(file);
        const removeButton = `
          <div class="image-preview-actions">
            <div class="image-preview-btn" id="removeImageBtn" title="Remover">
              <i class="fas fa-times"></i>
            </div>
          </div>
        `;

        if (type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = function(e) {
            container.innerHTML = `
              <div class="image-preview-item">
                <img src="${e.target.result}" alt="Preview">
                ${removeButton}
              </div>
            `;
            container.style.display = "flex";
            document.getElementById("removeImageBtn").addEventListener("click", clearAttachmentPreview);
          };
          reader.readAsDataURL(file);
          return;
        }

        container.innerHTML = `
          <div class="file-preview-item">
            <i class="${getAttachmentIcon(type)}"></i>
            <span class="file-preview-text">
              <span class="file-preview-name"></span>
              <span class="file-preview-meta">${formatBytes(file.size)}</span>
            </span>
            ${removeButton}
          </div>
        `;
        container.querySelector(".file-preview-name").textContent = file.name;
        container.style.display = "flex";
        document.getElementById("removeImageBtn").addEventListener("click", clearAttachmentPreview);
      });

      logoutBtn?.addEventListener("click", () => {
        if (typeof Auth !== 'undefined') Auth.logout();
      });

      // Report
      async function generateReportPdf() {
        if (!isAuthenticated) {
          alert("Faça login ou crie uma conta para exportar conversas em PDF.");
          return;
        }
        if (!lastAnalysisText) return alert("Faça uma análise primeiro.");
        const reportTargets = [btnReport, btnReportChat].filter(Boolean);
        reportTargets.forEach((b) => { b.disabled = true; });
        try {
          const res = await Auth.authenticatedFetch("/api/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: lastAnalysisText }),
          });
          let data = {};
          try {
            data = await res.json();
          } catch {
            data = {};
          }

          if (!res.ok) {
            alert(data.error || "Erro ao gerar PDF.");
            return;
          }

          if (data.url && typeof CONFIG !== 'undefined') {
            window.open(`${CONFIG.API_URL}${data.url}`, "_blank");
            return;
          }

          alert("PDF gerado sem URL de download.");
        } catch (e) {
          alert("Erro ao gerar PDF.");
        } finally {
          reportTargets.forEach((b) => { b.disabled = false; });
        }
      }
      btnReport.addEventListener("click", generateReportPdf);
      btnReportChat.addEventListener("click", generateReportPdf);

      // Load history
      (async () => {
        const cachedHistory = readChatHistoryCache();
        if (cachedHistory.length) {
          renderChatHistory(cachedHistory);
        } else {
          renderHistoryList();
        }

        if (!isAuthenticated || typeof Auth === "undefined") {
          return;
        }

        try {
          const latestId = getLatestHistoryId(cachedHistory);
          const endpoint = latestId
            ? `/api/chat/history?after_id=${encodeURIComponent(latestId)}&limit=100`
            : "/api/chat/history?limit=100";
          const res = await Auth.authenticatedFetch(endpoint, { redirectOnInvalid: false });
          if (res.ok) {
            const data = await res.json();
            if (data.chats) {
              const nextHistory = latestId
                ? mergeChatHistory(chatHistoryItems, data.chats)
                : data.chats;
              writeChatHistoryCache(nextHistory);
              renderChatHistory(nextHistory);
            }
          }
          if (!chatHistoryItems.length) renderHistoryList();
        } catch (error) {
          console.warn('Erro ao carregar histórico do chat:', error);
          if (!chatHistoryItems.length) renderHistoryList();
        }
      })();

      initWebSocketChat();

      function renderChatHistory(chats) {
        chatHistoryItems = Array.isArray(chats) ? chats : [];
        if (!chatHistoryItems.length) {
          activeHistoryKey = null;
          renderHistoryList();
          return;
        }

        const groups = Array.from(groupChatHistory(chatHistoryItems).values());
        const activeGroup = groups.find((group) => group.session_id === activeHistoryKey) || groups[groups.length - 1];
        if (activeGroup) {
          renderSession(activeGroup, { closeSidebar: false });
        } else {
          renderHistoryList();
        }
      }
