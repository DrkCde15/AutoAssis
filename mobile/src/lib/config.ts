import { Platform } from 'react-native';

// Em dev o app bate no backend local (mesmo que serve o site), onde o
// OpenStreetMap responde e a busca de mecânicos traz vários resultados.
// Para produção (Render), defina EXPO_PUBLIC_API_URL com a URL deployada.
const LOCAL_DEV_API_URL = 'http://192.168.15.5:5001';

function cleanUrl(value: string | undefined) {
  return (value || '').trim().replace(/\/+$/, '');
}

export const API_BASE_URL =
  cleanUrl(process.env.EXPO_PUBLIC_API_URL) ||
  cleanUrl(process.env.EXPO_PUBLIC_FLASK_URL) ||
  LOCAL_DEV_API_URL;

export const LOCAL_API_HINT = Platform.select({
  android: 'http://10.0.2.2:5000',
  ios: 'http://localhost:5000',
  web: 'http://localhost:5000',
  default: 'http://localhost:5000',
});

export const MOBILE_CLIENT_TOKEN = process.env.EXPO_PUBLIC_MOBILE_CLIENT_TOKEN || '';
