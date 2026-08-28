import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import type { Vehicle } from '@/lib/types';

type RequestFn = <T>(
  path: string,
  options?: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown },
) => Promise<T>;

type Props = {
  vehicle: Vehicle;
  request: RequestFn;
  size?: number;
  onUpdated?: (foto_base64: string | null) => void;
};

export function VehiclePhoto({ vehicle, request, size = 56, onUpdated }: Props) {
  const [uploading, setUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function choose(source: 'camera' | 'gallery' | 'remove') {
    try {
      if (source === 'remove') {
        setUploading(true);
        await request(`/api/veiculos/${vehicle.id}/foto`, { method: 'POST', body: { foto: null } });
        onUpdated?.(null);
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      };
      const res = source === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.length) return;
      const b64 = res.assets[0].base64;
      if (!b64) {
        Alert.alert('Erro', 'Não foi possível ler a imagem.');
        return;
      }
      setUploading(true);
      const data = await request<{ foto_base64: string }>(`/api/veiculos/${vehicle.id}/foto`, {
        method: 'POST',
        body: { foto: b64 },
      });
      onUpdated?.(data.foto_base64 ?? b64);
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao enviar a foto');
    } finally {
      setUploading(false);
    }
  }

  const radius = Math.min(size, 18);

  return (
    <>
      <Pressable style={[styles.photo, { width: size, height: size, borderRadius: radius }]} onPress={() => setMenuOpen(true)} hitSlop={8}>
        {vehicle.foto_base64 ? (
          <Image source={{ uri: `data:image/jpeg;base64,${vehicle.foto_base64}` }} style={[styles.photoImg, { borderRadius: radius }]} />
        ) : (
          <Ionicons name="car-sport" size={size * 0.62} color={Palette.primary} />
        )}
        <View style={[styles.badge, { borderColor: Palette.bg }]}>
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="camera" size={size * 0.26} color="#fff" />
          )}
        </View>
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Foto do veículo</Text>
            <View style={styles.sheetList}>
              <Pressable
                style={styles.sheetItem}
                onPress={() => {
                  setMenuOpen(false);
                  void choose('camera');
                }}>
                <Ionicons name="camera-outline" size={20} color={Palette.text} />
                <Text style={styles.sheetItemText}>Câmera</Text>
              </Pressable>
              <Pressable
                style={styles.sheetItem}
                onPress={() => {
                  setMenuOpen(false);
                  void choose('gallery');
                }}>
                <Ionicons name="images-outline" size={20} color={Palette.text} />
                <Text style={styles.sheetItemText}>Galeria</Text>
              </Pressable>
              {vehicle.foto_base64 ? (
                <Pressable
                  style={[styles.sheetItem, styles.sheetItemDanger]}
                  onPress={() => {
                    setMenuOpen(false);
                    void choose('remove');
                  }}>
                  <Ionicons name="trash-outline" size={20} color={Palette.red} />
                  <Text style={[styles.sheetItemText, styles.sheetItemTextDanger]}>Remover foto</Text>
                </Pressable>
              ) : null}
              <Pressable style={[styles.sheetItem, styles.sheetItemCancel]} onPress={() => setMenuOpen(false)}>
                <Text style={[styles.sheetItemText, styles.sheetItemTextCancel]}>Cancelar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  photo: {
    backgroundColor: Palette.bgAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: Palette.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  sheetTitle: {
    color: Palette.textMuted,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sheetList: { gap: 2, backgroundColor: Palette.bgAlt, borderRadius: Radius.lg, overflow: 'hidden' },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: Palette.surface,
  },
  sheetItemDanger: { backgroundColor: 'rgba(239,68,68,0.08)' },
  sheetItemCancel: { justifyContent: 'center', backgroundColor: Palette.surface, marginTop: Spacing.two, borderRadius: Radius.lg },
  sheetItemText: { color: Palette.text, fontSize: 16, fontWeight: '700', fontFamily: Fonts.sans },
  sheetItemTextDanger: { color: Palette.red },
  sheetItemTextCancel: { color: Palette.primary, textAlign: 'center' },
});
