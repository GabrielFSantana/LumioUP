import { EXPORT_MIME, type ExportFormat } from '@lumioup/core';
import { Platform } from 'react-native';

/**
 * Entrega o arquivo exportado: no celular grava no cache e abre o menu de compartilhar (salvar em
 * Arquivos, enviar para si mesmo etc.); no navegador baixa o arquivo. Nada é enviado a servidor.
 * Devolve false se o compartilhamento não estiver disponível.
 */
export async function deliverExport(
  format: ExportFormat,
  content: string,
  fileName: string,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: `${EXPORT_MIME[format]};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  }

  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  if (!(await Sharing.isAvailableAsync())) return false;

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, {
    mimeType: EXPORT_MIME[format],
    dialogTitle: 'Exportar meus dados',
    UTI: format === 'json' ? 'public.json' : 'public.comma-separated-values-text',
  });
  return true;
}
