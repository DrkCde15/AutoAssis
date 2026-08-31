import { useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Palette, Radius, Spacing } from '@/constants/theme';
import { AttachmentButton, type NogImage } from './AttachmentButton';
import { AttachmentMenu } from './AttachmentMenu';
import { MessageTextInput } from './MessageTextInput';
import { SendButton } from './SendButton';
import { VoiceButton } from './VoiceButton';
import { VoiceRecorder } from './VoiceRecorder';

export type { NogImage } from './AttachmentButton';

const WAVE_COUNT = 28;

type NogInputBarProps = {
  loading: boolean;
  pickedImage?: NogImage | null;
  onRemoveImage: () => void;
  onSend: (text: string, image?: NogImage) => void;
  onSendVoice: (uri: string) => void;
  onPickImage: (source: 'camera' | 'library') => void;
  onGeneratePdf: () => void;
};

export function NogInputBar({
  loading,
  pickedImage,
  onRemoveImage,
  onSend,
  onSendVoice,
  onPickImage,
  onGeneratePdf,
}: NogInputBarProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(() => new Array(WAVE_COUNT).fill(0.3));

  const recorderRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canSend = (!!text.trim() || !!pickedImage) && !loading && !recording;

  const stopTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveRef.current) clearInterval(waveRef.current);
    timerRef.current = null;
    waveRef.current = null;
  }, []);

  useEffect(() => () => stopTimers(), [stopTimers]);

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recorder = new Audio.Recording();
      await recorder.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recorder.startAsync();
      recorderRef.current = recorder;
      setSeconds(0);
      setWaveform(new Array(WAVE_COUNT).fill(0.3));
      setRecording(true);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      waveRef.current = setInterval(() => {
        setWaveform((prev) => {
          const next = prev.slice(1);
          next.push(0.25 + Math.random() * 0.75);
          return next;
        });
      }, 120);
    } catch {
      setRecording(false);
    }
  }, []);

  const finishRecording = useCallback(
    async (send: boolean) => {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      stopTimers();
      setRecording(false);
      if (!recorder) return;
      try {
        await recorder.stopAndUnloadAsync();
        const uri = recorder.getURI();
        if (send && uri) onSendVoice(uri);
      } catch {
        /* ignora falha ao finalizar */
      }
    },
    [onSendVoice, stopTimers],
  );

  function handleSend() {
    if (!canSend) return;
    onSend(text.trim(), pickedImage ?? undefined);
    setText('');
  }

  function toggleVoice() {
    if (recording) void finishRecording(true);
    else void startRecording();
  }

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + Spacing.one }]}>
      <AttachmentMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onCamera={() => {
          setMenuOpen(false);
          onPickImage('camera');
        }}
        onGallery={() => {
          setMenuOpen(false);
          onPickImage('library');
        }}
        onDocument={() => {
          setMenuOpen(false);
          onPickImage('library');
        }}
        onPdf={() => {
          setMenuOpen(false);
          onGeneratePdf();
        }}
      />

      <View style={styles.bar}>
        {recording ? (
          <>
            <Pressable onPress={() => void finishRecording(false)} hitSlop={6} style={styles.roundButton}>
              <Ionicons name="close" size={20} color={Palette.textMuted} />
            </Pressable>
            <VoiceRecorder seconds={seconds} waveform={waveform} />
            <Pressable onPress={() => void finishRecording(true)} hitSlop={6} style={[styles.roundButton, styles.roundButtonStop]}>
              <Ionicons name="stop" size={18} color={Palette.white} />
            </Pressable>
          </>
        ) : (
          <>
            <AttachmentButton active={menuOpen} onPress={() => setMenuOpen((v) => !v)} />
            <View style={styles.field}>
              {pickedImage ? (
                <View style={styles.thumbWrap}>
                  <Image source={{ uri: pickedImage.uri }} style={styles.thumb} />
                  <Pressable onPress={onRemoveImage} hitSlop={6} style={styles.thumbRemove}>
                    <Ionicons name="close" size={10} color={Palette.white} />
                  </Pressable>
                </View>
              ) : null}
              <MessageTextInput value={text} onChangeText={setText} editable={!loading} />
              <VoiceButton onPress={toggleVoice} recording={false} />
            </View>
            <SendButton onPress={handleSend} disabled={!canSend} loading={loading} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    backgroundColor: 'rgba(9, 9, 11, 0.88)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  field: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  thumbWrap: {
    position: 'relative',
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    marginVertical: 4,
  },
  thumb: {
    width: 32,
    height: 32,
  },
  thumbRemove: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.red,
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  roundButtonStop: {
    backgroundColor: Palette.red,
    borderColor: Palette.red,
  },
});
