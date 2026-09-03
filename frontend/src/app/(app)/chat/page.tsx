"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, authFetch } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  MessageCircle,
  Send,
  Paperclip,
  Image as ImageIcon,
  Mic,
  MicOff,
  Search,
  Plus,
  Trash2,
  X,
  FileText,
  File,
  Menu,
  Loader2,
  AlertTriangle,
  Bot,
  Camera,
  Download,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  file_url?: string;
  file_type?: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  vehicle_id?: number;
  messages: Message[];
}

interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
}

const FREE_MESSAGE_LIMIT = 5;

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [freeMessagesLeft, setFreeMessagesLeft] = useState(FREE_MESSAGE_LIMIT);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-attach-dropdown]")) {
        setAttachOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await getUser();
        if (!currentUser) {
          router.push("/login");
          return;
        }
        setUser(currentUser);

        const [convRes, vehiclesRes] = await Promise.all([
          authFetch("/api/chat/conversations"),
          authFetch("/api/veiculos"),
        ]);

        if (convRes.ok) {
          const convData = await convRes.json();
          const convs = (convData.conversations ?? []).map((c: any) => ({
            id: c.session_id ?? `conv-${c.updated_at}`,
            title: c.title ?? "Nova conversa",
            created_at: c.updated_at ?? "",
            messages: [],
          }));
          setSessions(convs);
          if (convs.length > 0) {
            setActiveSession(convs[0].id);
            const histRes = await authFetch(`/api/chat/history?session_id=${convs[0].id}`);
            if (histRes.ok) {
              const histData = await histRes.json();
              const msgs = (histData.chats ?? []).map((ch: any) => ({
                id: String(ch.id),
                role: "user" as const,
                content: ch.mensagem_usuario ?? "",
                timestamp: ch.created_at ?? "",
              })).concat((histData.chats ?? []).map((ch: any) => ({
                id: String(ch.id) + "-ai",
                role: "assistant" as const,
                content: ch.resposta_ia ?? "",
                timestamp: ch.created_at ?? "",
              })));
              setMessages(msgs);
            }
          }
        }

        if (vehiclesRes.ok) {
          const vehiclesData = await vehiclesRes.json();
          setVehicles(vehiclesData.veiculos ?? vehiclesData ?? []);
        }
      } catch (error) {
        console.error("Failed to initialize chat:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws/chat`);

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: data.content,
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsTyping(false);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = () => {
      console.log("WebSocket error, will use HTTP fallback");
    };

    ws.onclose = () => {
      setTimeout(connectWebSocket, 3000);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      wsRef.current?.close();
    };
  }, [connectWebSocket]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const sendMessage = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    let attachmentPayload: any = undefined;
    if (attachedFiles.length > 0) {
      const file = attachedFiles[0];
      const dataUrl = await fileToBase64(file);
      attachmentPayload = { name: file.name, type: file.type, data: dataUrl };
    }
    setAttachedFiles([]);

    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            message: input,
            vehicle_id: selectedVehicle,
            ...(attachmentPayload ? { attachment: attachmentPayload } : {}),
          })
        );
      } else {
        const body: any = {
          message: input,
          vehicle_id: selectedVehicle,
          session_id: activeSession,
        };
        if (attachmentPayload) body.attachment = attachmentPayload;

        const response = await authFetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: data.response,
              timestamp: new Date().toISOString(),
            },
          ]);

          if (!activeSession && data.session_id) {
            setActiveSession(data.session_id);
          }
        }

        setIsTyping(false);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const maxSize = 8 * 1024 * 1024;
    const allowedTypes = [
      "image/",
      "application/pdf",
      "text/plain",
      "text/csv",
      "text/markdown",
      "application/json",
    ];

    const validFiles = files.filter((file) => {
      if (file.size > maxSize) return false;
      return allowedTypes.some((type) => file.type.startsWith(type));
    });

    setAttachedFiles((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreviewUrls((prev) => ({ ...prev, [file.name]: url }));
      }
    });
  };

  const removeFile = (fileName: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== fileName));
    if (previewUrls[fileName]) {
      URL.revokeObjectURL(previewUrls[fileName]);
      setPreviewUrls((prev) => {
        const next = { ...prev };
        delete next[fileName];
        return next;
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        mediaRecorderRef.current = null;
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        try {
          const response = await authFetch("/api/voice", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            setInput(data.text ?? "");
          }
        } catch (error) {
          console.error("Failed to process voice:", error);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 30000);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const chatText = messages
        .map((m) => `${m.role === "user" ? "Usuario" : "NOG"}: ${m.content}`)
        .join("\n\n");

      const response = await authFetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chatText }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          const fileRes = await authFetch(data.url);
          if (fileRes.ok) {
            const blob = await fileRes.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `relatorio-${new Date().toISOString().split("T")[0]}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setGeneratingReport(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await authFetch(`/api/chat/session/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const fetchSessionMessages = async (sessionId: string) => {
    try {
      const histRes = await authFetch(`/api/chat/history?session_id=${sessionId}`);
      if (histRes.ok) {
        const histData = await histRes.json();
        const msgs = (histData.chats ?? []).map((ch: any) => ({
          id: String(ch.id),
          role: "user" as const,
          content: ch.mensagem_usuario ?? "",
          timestamp: ch.created_at ?? "",
        })).concat((histData.chats ?? []).map((ch: any) => ({
          id: String(ch.id) + "-ai",
          role: "assistant" as const,
          content: ch.resposta_ia ?? "",
          timestamp: ch.created_at ?? "",
        })));
        setMessages(msgs);
      }
    } catch (error) {
      console.error("Failed to fetch session messages:", error);
    }
  };

  const createNewChat = () => {
    setActiveSession(null);
    setMessages([]);
    setInput("");
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith(".pdf")) return <FileText className="w-4 h-4" />;
    if (fileName.endsWith(".json")) return <FileText className="w-4 h-4" />;
    if (fileName.endsWith(".csv")) return <FileText className="w-4 h-4" />;
    if (fileName.endsWith(".md")) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-[316px] bg-secondary border-r border-border flex flex-col transform transition-transform duration-200 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="p-4 border-b border-border">
            <Button onClick={createNewChat} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Novo chat
            </Button>
          </div>

          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-primary border border-border rounded-lg px-3 py-1.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredSessions.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-muted">Nenhuma conversa ainda</p>
              </div>
            ) : (
              filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-primary transition-colors ${
                    activeSession === session.id ? "bg-primary border-l-2 border-accent" : ""
                  }`}
                  onClick={() => {
                    setActiveSession(session.id);
                    setMessages([]);
                    fetchSessionMessages(session.id);
                    setSidebarOpen(false);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary truncate">{session.title}</p>
                    <p className="text-xs text-muted">
                      {new Date(session.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-danger" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 p-2 border-b border-border lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Bot className="w-5 h-5 text-accent" />
            <span className="text-sm font-semibold text-primary">NOG Chat</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!user?.id && (
              <div className="bg-accent/10 border-b border-accent/20 p-4">
                <div className="max-w-[920px] mx-auto flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-accent shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-primary">
                      Você tem {freeMessagesLeft} mensagens grátis restantes.
                    </p>
                  </div>
                  <Link href="/cadastro">
                    <Button size="sm">Criar conta</Button>
                  </Link>
                </div>
              </div>
            )}

            <div className="bg-secondary/50 border-b border-border p-4">
              <div className="max-w-[920px] mx-auto">
                <p className="text-xs text-muted text-center">
                  O NOG fornece informações sobre manutenção automotiva. Sempre confirme com um profissional.
                </p>
              </div>
            </div>

            <div className="max-w-[920px] mx-auto px-4 py-6 space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <Bot className="w-16 h-16 text-accent mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-primary mb-2">Olá! Sou o NOG</h2>
                  <p className="text-secondary max-w-md mx-auto">
                    Seu assistente automotivo inteligente. Pergunte sobre manutenção,
                    diagnósticos, peças ou qualquer dúvida sobre seu veículo.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-accent text-white"
                        : "bg-secondary border border-border text-primary"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-accent" />
                        <span className="text-xs font-medium text-accent">NOG</span>
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    {msg.file_url && (
                      <div className="mt-2">
                        {msg.file_type?.startsWith("image/") ? (
                          <img
                            src={msg.file_url}
                            alt="Anexo"
                            className="max-w-full rounded-lg"
                          />
                        ) : (
                          <a
                            href={msg.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm underline"
                          >
                            <FileText className="w-4 h-4" />
                            Ver arquivo
                          </a>
                        )}
                      </div>
                    )}
                    <div className="text-xs mt-2 opacity-60">
                      {new Date(msg.timestamp).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-secondary border border-border rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-accent" />
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:0.1s]" />
                        <div className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:0.2s]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-border bg-secondary p-4 shrink-0">
            <div className="max-w-[920px] mx-auto">
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {attachedFiles.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center gap-2 bg-primary border border-border rounded-lg px-3 py-1.5"
                    >
                      {previewUrls[file.name] ? (
                        <img
                          src={previewUrls[file.name]}
                          alt={file.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        getFileIcon(file.name)
                      )}
                      <span className="text-xs text-secondary max-w-[100px] truncate">
                        {file.name}
                      </span>
                      <button onClick={() => removeFile(file.name)}>
                        <X className="w-3 h-3 text-muted hover:text-danger" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="relative" data-attach-dropdown>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt,.csv,.md,.json"
                    onChange={handleFileAttach}
                    className="hidden"
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileAttach}
                    className="hidden"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAttachOpen(!attachOpen)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  {attachOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-secondary border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                      <button
                        onClick={() => {
                          imageInputRef.current?.click();
                          setAttachOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-primary hover:bg-primary transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        Enviar imagem
                      </button>
                      <button
                        onClick={() => {
                          fileInputRef.current?.click();
                          setAttachOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-primary hover:bg-primary transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Enviar arquivo
                      </button>
                      <button
                        onClick={() => {
                          generateReport();
                          setAttachOpen(false);
                        }}
                        disabled={generatingReport || messages.length === 0}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-primary hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingReport ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Baixar conversa em PDF
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua mensagem..."
                    rows={1}
                    className="w-full bg-primary border border-border rounded-xl px-4 py-3 text-sm text-primary placeholder:text-muted resize-none focus:outline-none focus:border-accent min-h-[44px] max-h-[120px]"
                    style={{ height: "auto" }}
                  />
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={isRecording ? "text-danger" : ""}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>

                  <Button
                    size="sm"
                    onClick={sendMessage}
                    disabled={!input.trim() && attachedFiles.length === 0}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileAttach}
        className="hidden"
      />
    </div>
  );
}
