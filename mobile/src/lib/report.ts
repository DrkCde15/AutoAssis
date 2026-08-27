import * as FileSystem from 'expo-file-system';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { API_BASE_URL } from './config';

type ReportRequest = (
  path: string,
  options?: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; body?: unknown },
) => Promise<{ url?: string }>;

export async function generateReportPdf(text: string, accessToken: string, request: ReportRequest) {
  const result = await request('/api/report', { method: 'POST', body: { text } });
  const url = result.url;
  if (!url) {
    throw new Error('O servidor nao retornou o arquivo do relatorio.');
  }
  const filename = url.split('/').pop() || 'relatorio.pdf';
  const file = new File(Paths.cache, filename);
  await FileSystem.downloadAsync(`${API_BASE_URL}${url}`, file.uri, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Salvar ou abrir relatorio do carro',
  });
}
