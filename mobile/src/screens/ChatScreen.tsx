import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, Card, EmptyState } from '@/components/primitives';
import { NogInputBar, type NogImage } from '@/components/nog/NogInputBar';
import { Fonts, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { stripMarkdown } from '@/lib/format';
import { generateReportPdf } from '@/lib/report';
import type { ChatRecord, Conversation, LinkItem, VideoItem, Vehicle } from '@/lib/types';
import type { Nav } from '@/screens/AppShell';
import { useAuth } from '@/context/auth';

type PickedImage = { uri: string; base64: string };

function newSessionId() {
  return 'nog-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function formatTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatConversationDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function ChatScreen({ nav }: { nav: Nav }) {
  const { request, accessToken, user } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [history, setHistory] = useState<ChatRecord[]>([]);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState('NOG');
  const [modalVisible, setModalVisible] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<number | null>(null);

  const loadConversations = useCallback(async (query = '') => {
    setConvLoading(true);
    try {
      const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
      const data = await request<{ conversations: Conversation[] }>(`/api/chat/conversations${qs}`);
      setConversations(data.conversations || []);
    } catch {
      setConversations([]);
    } finally {
      setConvLoading(false);
    }
  }, [request]);

  const openConversation = useCallback(async (conv: Conversation, closeModal = true) => {
    setSessionId(conv.session_id);
    setCurrentTitle(conv.title || 'NOG');
    if (closeModal) setModalVisible(false);
    setLoadingHistory(true);
    try {
      const qs = conv.session_id == null ? '?session_id=null' : `?session_id=${encodeURIComponent(conv.session_id)}`;
      const data = await request<{ chats: ChatRecord[] }>(`/api/chat/history${qs}`);
      setHistory((data.chats || []).slice(-50));
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [request]);

  const startNewConversation = useCallback(() => {
    setSessionId(newSessionId());
    setCurrentTitle('Nova conversa');
    setHistory([]);
    setModalVisible(false);
  }, []);

  function openModal() {
    setSearch('');
    setModalVisible(true);
    void loadConversations('');
  }

  function onSearchChange(text: string) {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void loadConversations(text), 300);
  }

  useEffect(() => {
    const timer = setTimeout(() => void bootstrap(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await request<{ veiculos: Vehicle[] }>('/api/veiculos');
        if (!mounted) return;
        const list = data.veiculos || [];
        setVehicles(list);
        setVehicleId((prev) => prev ?? list[0]?.id ?? null);
      } catch {
        /* vehicles opcionais no chat */
      }
    })();
    return () => {
      mounted = false;
    };
  }, [request]);

  async function bootstrap() {
    setLoadingHistory(true);
    try {
      const data = await request<{ conversations: Conversation[] }>('/api/chat/conversations');
      const list = data.conversations || [];
      if (list.length) {
        await openConversation(list[0], false);
        return;
      }
      setHistory([]);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [history, loading]);

  async function pickFromLibrary() {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permissão para acessar imagens negada.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      base64: true,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setPickedImage({ uri: result.assets[0].uri, base64: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  }

  async function takePhoto() {
    setError('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Permissão para usar a câmera negada.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      base64: true,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setPickedImage({ uri: result.assets[0].uri, base64: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  }

  async function send(text: string, image?: PickedImage) {
    const trimmed = (text ?? '').trim();
    const attachment = image ?? pickedImage;
    if (!trimmed && !attachment) return;
    setError('');
    setLoading(true);

    const optimistic: ChatRecord = {
      mensagem_usuario: trimmed || 'Imagem anexada',
      resposta_ia: 'Analisando...',
      created_at: new Date().toISOString(),
    };
    setHistory((items) => [...items, optimistic]);

    try {
      const response = await request<{ response: string; videos: VideoItem[]; links: LinkItem[]; chat: ChatRecord }>(
        '/api/chat',
        { method: 'POST', body: { message: trimmed, image: attachment?.base64, session_id: sessionId ?? undefined, ignore_global_history: false, vehicle_id: vehicleId ?? undefined } },
      );
      setHistory((items) => [...items.slice(0, -1), response.chat]);
      setPickedImage(null);
    } catch (sendError) {
      setHistory((items) => items.slice(0, -1));
      setError(sendError instanceof Error ? sendError.message : 'Não foi possível enviar a consulta.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendVoice(uri: string) {
    setError('');
    setLoading(true);
    try {
      const optimistic: ChatRecord = {
        mensagem_usuario: '🎤 (transcrevendo...)',
        resposta_ia: 'Analisando...',
        created_at: new Date().toISOString(),
      };
      setHistory((items) => [...items, optimistic]);

      const form = new FormData();
      form.append('audio', { uri, name: 'voice.m4a', type: 'audio/m4a' } as unknown as Blob);
      form.append('session_id', sessionId ?? '');

      const response = await request<{ text: string; response: string; chat: ChatRecord }>('/api/voice', {
        method: 'POST',
        body: form,
      });
      setHistory((items) => [...items.slice(0, -1), response.chat]);
    } catch (voiceError) {
      setHistory((items) => items.slice(0, -1));
      setError(voiceError instanceof Error ? voiceError.message : 'Não foi possível enviar o áudio.');
    } finally {
      setLoading(false);
    }
  }

  async function generateChatReport() {
    if (!accessToken) {
      setError('Voce precisa estar logado para gerar o relatorio.');
      return;
    }
    if (!history.length) {
      setError('Nao ha conversa para gerar o relatorio.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const text = history
        .map((c) => `Pergunta: ${c.mensagem_usuario}\nResposta NOG: ${stripMarkdown(c.resposta_ia || '')}`)
        .join('\n\n');
      await generateReportPdf(text, accessToken, request);
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'Falha ao gerar o relatorio.');
    } finally {
      setLoading(false);
    }
  }

  const greeting = user?.nome ? user.nome.split(' ')[0] : 'motorista';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior="padding"
      keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.openDrawer()} style={styles.headerBtn} hitSlop={10}>
          <Ionicons name="menu" size={20} color={Palette.textMuted} />
        </Pressable>
        <Pressable onPress={openModal} style={styles.headerCenter} hitSlop={10}>
          <Text style={styles.headerTitle} numberOfLines={1}>{currentTitle}</Text>
          {vehicles.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleChips}>
              <Pressable
                onPress={() => setVehicleId(null)}
                style={[styles.vehicleChip, vehicleId === null ? styles.vehicleChipActive : null]}>
                <Text style={[styles.vehicleChipText, vehicleId === null ? styles.vehicleChipTextActive : null]}>Todos</Text>
              </Pressable>
              {vehicles.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => setVehicleId(v.id)}
                  style={[styles.vehicleChip, vehicleId === v.id ? styles.vehicleChipActive : null]}>
                  <Text style={[styles.vehicleChipText, vehicleId === v.id ? styles.vehicleChipTextActive : null]} numberOfLines={1}>
                    {[v.marca, v.modelo].filter(Boolean).join(' ') || 'Veículo'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </Pressable>
        <Pressable onPress={startNewConversation} style={styles.headerBtn} hitSlop={10}>
          <Ionicons name="add" size={24} color={Palette.primary} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled">
        {history.length === 0 && !loadingHistory ? (
          <View style={styles.emptyChat}>
            <View style={styles.welcomeMark}>
              <Text style={styles.welcomeMarkText}>NOG</Text>
            </View>
            <Text style={styles.welcomeTitle}>Olá, {greeting}.</Text>
            <Text style={styles.welcomeSub}>Como posso ajudar com seu carro?</Text>
            <View style={styles.suggestions}>
              <Pressable onPress={() => send('Qual a FIPE do meu carro?')} style={styles.suggestion}>
                <Text style={styles.suggestionText}>Consultar FIPE</Text>
              </Pressable>
              <Pressable onPress={() => send('Preciso de ajuda com uma manutenção')} style={styles.suggestion}>
                <Text style={styles.suggestionText}>Manutenção</Text>
              </Pressable>
              <Pressable onPress={() => _nav.goTo('raiox')} style={styles.suggestion}>
                <Text style={styles.suggestionText}>Raio-X</Text>
              </Pressable>
              <Pressable onPress={() => send('Me dê dicas de economia de combustível')} style={styles.suggestion}>
                <Text style={styles.suggestionText}>Dicas</Text>
              </Pressable>
            </View>
          </View>
        ) : loadingHistory ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Palette.primary} />
          </View>
        ) : (
          history.map((chat, index) => <ChatBubble key={`${chat.id || index}`} chat={chat} />)
        )}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <NogInputBar
        loading={loading}
        pickedImage={pickedImage}
        onRemoveImage={() => setPickedImage(null)}
        onSend={send}
        onSendVoice={handleSendVoice}
        onPickImage={(source) => (source === 'camera' ? takePhoto() : pickFromLibrary())}
        onGeneratePdf={generateChatReport}
      />

      {modalVisible ? (
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPress} onPress={() => setModalVisible(false)} />
          <View style={[styles.modal, { paddingBottom: insets.bottom + Spacing.four }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Conversas</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalClose} hitSlop={8}>
                <Ionicons name="close" size={20} color={Palette.textMuted} />
              </Pressable>
            </View>

            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color={Palette.textSoft} />
              <TextInput
                value={search}
                onChangeText={onSearchChange}
                placeholder="Buscar..."
                placeholderTextColor={Palette.textSoft}
                style={styles.searchInput}
              />
            </View>

            <Pressable onPress={startNewConversation} style={styles.newConvBtn}>
              <Ionicons name="add-circle" size={20} color={Palette.primary} />
              <Text style={styles.newConvText}>Nova conversa</Text>
            </Pressable>

            <ScrollView style={styles.convList}>
              {convLoading ? (
                <ActivityIndicator color={Palette.primary} style={{ marginVertical: Spacing.four }} />
              ) : conversations.length ? (
                conversations.map((conv) => (
                  <Pressable
                    key={conv.session_id ?? 'null'}
                    onPress={() => void openConversation(conv)}
                    style={[styles.convItem, conv.session_id === sessionId ? styles.convItemActive : null]}>
                    <View style={styles.convItemText}>
                      <Text style={styles.convTitle} numberOfLines={1}>{conv.title}</Text>
                      <Text style={styles.convPreview} numberOfLines={1}>{conv.preview || 'Sem mensagens'}</Text>
                    </View>
                    <View style={styles.convMeta}>
                      <Text style={styles.convCount}>{conv.count}</Text>
                      <Text style={styles.convDate}>{formatConversationDate(conv.updated_at)}</Text>
                    </View>
                  </Pressable>
                ))
              ) : (
                <EmptyState title="Nenhuma conversa" body="Inicie uma nova conversa com a NOG." />
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function ChatBubble({ chat }: { chat: ChatRecord }) {
  return (
    <View style={styles.chatBlock}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{chat.mensagem_usuario}</Text>
        <Text style={styles.userTime}>{formatTime(chat.created_at)}</Text>
      </View>
      <View style={styles.botBubble}>
        <Text style={styles.botText}>{stripMarkdown(chat.resposta_ia || '')}</Text>
        <AttachmentList videos={chat.videos || []} links={chat.links || []} />
      </View>
    </View>
  );
}

function AttachmentList({ videos, links }: { videos: VideoItem[]; links: LinkItem[] }) {
  const items = [
    ...videos.map((item) => ({ title: item.titulo || 'Vídeo recomendado', url: item.url })),
    ...links.map((item) => ({ title: item.titulo || 'Link recomendado', url: item.url })),
  ].filter((item) => item.url);

  if (!items.length) return null;

  return (
    <View style={styles.attachments}>
      {items.slice(0, 4).map((item, index) => (
        <Pressable
          key={`${item.url}-${index}`}
          onPress={() => item.url && Linking.openURL(item.url)}
          style={styles.attachmentButton}>
          <Ionicons name="link" size={14} color={Palette.blue} />
          <Text style={styles.attachmentText} numberOfLines={1}>{item.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
    backgroundColor: Palette.bg,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    gap: Spacing.one,
  },
  headerTitle: {
    color: Palette.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
  vehicleChips: {
    gap: Spacing.one,
  },
  vehicleChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Palette.surface,
  },
  vehicleChipActive: {
    backgroundColor: Palette.primaryMuted,
  },
  vehicleChipText: {
    color: Palette.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  vehicleChipTextActive: {
    color: Palette.primary,
  },
  messages: {
    padding: Spacing.four,
    gap: Spacing.four,
    flexGrow: 1,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.ten,
  },
  welcomeMark: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    backgroundColor: Palette.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.3)',
  },
  welcomeMarkText: {
    color: Palette.primary,
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Fonts.sans,
    letterSpacing: 1,
  },
  welcomeTitle: {
    color: Palette.text,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Fonts.serif,
    letterSpacing: -0.3,
  },
  welcomeSub: {
    color: Palette.textMuted,
    fontSize: 15,
    fontFamily: Fonts.sans,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  suggestion: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  suggestionText: {
    color: Palette.textMuted,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.sans,
  },
  loadingWrap: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
  },
  chatBlock: { gap: Spacing.three },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    backgroundColor: Palette.primary,
    borderTopRightRadius: Radius.sm,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  userText: { color: Palette.white, lineHeight: 21, fontSize: 15 },
  userTime: { color: 'rgba(255,255,255,0.6)', fontSize: 10, alignSelf: 'flex-end' },
  botBubble: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Radius.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  botText: { color: Palette.text, lineHeight: 22, fontSize: 15 },
  attachments: { gap: Spacing.one },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    padding: Spacing.two,
    backgroundColor: Palette.bgAlt,
  },
  attachmentText: { color: Palette.blue, fontWeight: '600', fontSize: 13, flex: 1 },
  error: { color: Palette.red, paddingHorizontal: Spacing.four, paddingBottom: Spacing.one, fontSize: 13 },

  /* Modal */
  modalBackdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropPress: { position: 'absolute', inset: 0 },
  modal: {
    maxHeight: '80%',
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.borderStrong,
    alignSelf: 'center',
    marginBottom: Spacing.one,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { color: Palette.text, fontSize: 18, fontWeight: '800', fontFamily: Fonts.sans },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.bgAlt,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bg,
  },
  searchInput: {
    flex: 1,
    color: Palette.text,
    fontSize: 15,
    fontFamily: Fonts.sans,
  },
  newConvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  newConvText: {
    color: Palette.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  convList: { maxHeight: 360 },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginBottom: Spacing.one,
  },
  convItemActive: {
    backgroundColor: Palette.primaryMuted,
  },
  convItemText: { flex: 1, gap: 2 },
  convTitle: { color: Palette.text, fontWeight: '700', fontSize: 14 },
  convPreview: { color: Palette.textMuted, fontSize: 12 },
  convMeta: { alignItems: 'flex-end', gap: 2 },
  convCount: {
    color: Palette.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  convDate: { color: Palette.textSoft, fontSize: 11 },
});
