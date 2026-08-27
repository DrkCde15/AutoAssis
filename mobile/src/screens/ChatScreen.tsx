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

import { AppButton, Card, EmptyState } from '@/components/primitives';
import { NogInputBar, type NogImage } from '@/components/nog/NogInputBar';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { stripMarkdown } from '@/lib/format';
import { generateReportPdf } from '@/lib/report';
import type { ChatRecord, Conversation, LinkItem, VideoItem } from '@/lib/types';
import type { Nav } from '@/screens/AppShell';
import { useAuth } from '@/context/auth';

type PickedImage = { uri: string; base64: string };

function newSessionId() {
  return 'nog-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function formatConversationDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR');
}

export function ChatScreen({ nav: _nav }: { nav: Nav }) {
  const { request, accessToken } = useAuth();
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
        { method: 'POST', body: { message: trimmed, image: attachment?.base64, session_id: sessionId ?? undefined, ignore_global_history: false } },
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

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.toolbar}>
        <Pressable onPress={openModal} style={styles.toolbarButton} hitSlop={8}>
          <Ionicons name="chatbubbles-outline" size={22} color={Palette.text} />
        </Pressable>
        <View style={styles.toolbarTitleWrap}>
          <Text style={styles.toolbarTitle} numberOfLines={1}>{currentTitle}</Text>
        </View>
        <Pressable onPress={startNewConversation} style={styles.toolbarButton} hitSlop={8}>
          <Ionicons name="create-outline" size={22} color={Palette.primary} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled">
        <Card style={styles.intro}>
          <Text style={styles.title}>NOG — seu copiloto de carro</Text>
          <Text style={styles.muted}>
            Especialista em automóveis. Pergunte sobre sintomas, manutenção, FIPE ou envie uma foto para o Raio-X.
          </Text>
        </Card>

        {loadingHistory ? (
          <ActivityIndicator color={Palette.primary} />
        ) : history.length ? (
          history.map((chat, index) => <ChatBubble key={`${chat.id || index}`} chat={chat} />)
        ) : (
          <EmptyState title="Sem conversas ainda" body="Mande sua primeira pergunta para iniciar o diagnóstico." />
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
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Conversas</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={Palette.text} />
              </Pressable>
            </View>

            <View style={styles.searchRow}>
              <Ionicons name="search" size={18} color={Palette.textSoft} />
              <TextInput
                value={search}
                onChangeText={onSearchChange}
                placeholder="Buscar conversas..."
                placeholderTextColor={Palette.textSoft}
                style={styles.searchInput}
              />
            </View>

            <AppButton title="Nova conversa" onPress={startNewConversation} />

            <ScrollView style={styles.convList}>
              {convLoading ? (
                <ActivityIndicator color={Palette.primary} />
              ) : conversations.length ? (
                conversations.map((conv) => (
                  <Pressable
                    key={conv.session_id ?? 'null'}
                    onPress={() => void openConversation(conv)}
                    style={styles.convItem}>
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
          <Text style={styles.attachmentText}>{item.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    backgroundColor: Palette.surface,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.bgAlt,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  toolbarTitleWrap: { flex: 1 },
  toolbarTitle: { color: Palette.text, fontSize: 17, fontFamily: Fonts.serif, fontWeight: '900' },
  modalBackdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdropPress: { position: 'absolute', inset: 0 },
  modal: {
    maxHeight: '80%',
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { color: Palette.text, fontSize: 20, fontFamily: Fonts.serif, fontWeight: '900' },
  modalClose: {
    width: 40,
    height: 40,
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
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bg,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    color: Palette.text,
    fontSize: 15,
    fontFamily: Fonts.sans,
    paddingVertical: 10,
  },
  convList: { maxHeight: 360, gap: Spacing.two },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.bgAlt,
  },
  convItemText: { flex: 1, gap: 2 },
  convTitle: { color: Palette.text, fontWeight: '800', fontSize: 15 },
  convPreview: { color: Palette.textMuted, fontSize: 13 },
  convMeta: { alignItems: 'flex-end', gap: 2 },
  convCount: {
    color: Palette.white,
    backgroundColor: Palette.primary,
    fontWeight: '800',
    fontSize: 12,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  convDate: { color: Palette.textSoft, fontSize: 11 },
  messages: { padding: Spacing.three, gap: Spacing.three },
  intro: { gap: Spacing.one },
  title: { color: Palette.text, fontSize: 20, fontFamily: Fonts.serif, fontWeight: '900' },
  muted: { color: Palette.textMuted, lineHeight: 20 },
  chatBlock: { gap: Spacing.one },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    backgroundColor: Palette.primary,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  userText: { color: Palette.white, lineHeight: 20 },
  botBubble: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  botText: { color: Palette.text, lineHeight: 21 },
  attachments: { gap: Spacing.one },
  attachmentButton: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    padding: Spacing.two,
    backgroundColor: Palette.bgAlt,
  },
  attachmentText: { color: Palette.blue, fontWeight: '700' },
  error: { color: Palette.red, paddingHorizontal: Spacing.three, paddingBottom: Spacing.one },
});
