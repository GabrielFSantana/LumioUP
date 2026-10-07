import {
  consentLabel,
  exportFileName,
  formatBrDate,
  toDateString,
  transactionsToCsv,
  type ExportFormat,
} from '@lumioup/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import {
  Button,
  Card,
  ConfirmButton,
  Screen,
  Text,
  TextField,
  useToast,
} from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/AuthProvider';
import {
  deleteMyAccount,
  exportMyData,
  friendlyPrivacyError,
  listConsents,
} from '../../src/features/privacy/api';
import { deliverExport } from '../../src/features/privacy/exporter';
import { spacing } from '../../src/theme';

export default function PrivacidadeScreen() {
  const toast = useToast();
  const { session } = useAuth();
  const consents = useQuery({ queryKey: ['consents'], queryFn: listConsents });
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doExport = async (format: ExportFormat) => {
    setExporting(format);
    try {
      const data = await exportMyData();
      const content = format === 'json' ? JSON.stringify(data, null, 2) : transactionsToCsv(data);
      const ok = await deliverExport(
        format,
        content,
        exportFileName(format, toDateString(new Date())),
      );
      toast.show({
        message: ok ? 'Arquivo pronto.' : 'Este aparelho não permite compartilhar arquivos.',
      });
    } catch (e) {
      toast.show({ message: friendlyPrivacyError(e) });
    } finally {
      setExporting(null);
    }
  };

  const deleteAccount = async () => {
    const email = session?.user.email;
    if (!email) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteMyAccount(email, password);
      // A sessão local foi encerrada: o app volta sozinho para a tela de entrada.
    } catch (e) {
      setError(friendlyPrivacyError(e));
      setDeleting(false);
    }
  };

  return (
    <Screen withHeader>
      <Card>
        <Text variant="heading">Seus dados são seus</Text>
        <Text variant="caption">
          O LumioUP guarda só o que você registra (lançamentos, contas, metas, progresso) e seus
          dados de cadastro. Não há conexão com bancos. Nos clubes, os outros membros veem apenas
          seu nome e, se você permitir, nível, XP e sequência. Valores em reais nunca são
          compartilhados.
        </Text>
      </Card>

      <Card>
        <Text variant="heading">Exportar meus dados</Text>
        <Text variant="caption">
          Receba uma cópia completa em JSON ou só os lançamentos em CSV (abre em planilhas). O
          arquivo é gerado agora e vai direto para você.
        </Text>
        <Button
          label={exporting === 'json' ? 'Preparando…' : 'Exportar tudo (JSON)'}
          variant="secondary"
          disabled={exporting !== null}
          onPress={() => doExport('json')}
        />
        <Button
          label={exporting === 'csv' ? 'Preparando…' : 'Exportar lançamentos (CSV)'}
          variant="secondary"
          disabled={exporting !== null}
          onPress={() => doExport('csv')}
        />
      </Card>

      <Card>
        <Text variant="heading">Termos aceitos</Text>
        {consents.isLoading ? <Text tone="textMuted">Carregando…</Text> : null}
        {(consents.data ?? []).length === 0 && !consents.isLoading ? (
          <Text variant="caption">Nenhum registro de aceite.</Text>
        ) : null}
        {(consents.data ?? []).map((item) => (
          <View key={`${item.type}-${item.acceptedAt}`} style={{ gap: 2 }}>
            <Text variant="bodyBold">{consentLabel(item.type)}</Text>
            <Text variant="caption">
              {`Versão ${item.version} · aceito em ${formatBrDate(toDateString(new Date(item.acceptedAt)))}`}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text variant="heading">Excluir minha conta</Text>
        <Text variant="caption">
          Apaga de forma definitiva sua conta e todos os seus dados: lançamentos, contas, metas, XP,
          conquistas e progresso. Não dá para desfazer. Se você é dona ou dono de um clube com
          outras pessoas, o clube continua e a propriedade passa para o admin mais antigo (ou o
          membro mais antigo). Se era a única pessoa, o clube é apagado.
        </Text>
        <Text variant="caption">Exporte seus dados antes, se quiser guardar uma cópia.</Text>
        <TextField
          label="Digite sua senha para confirmar"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
        />
        {error ? (
          <Text tone="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <View style={{ gap: spacing.sm }}>
          <ConfirmButton
            label={deleting ? 'Excluindo…' : 'Excluir minha conta'}
            confirmLabel="Toque de novo: apagar tudo para sempre"
            disabled={password.length === 0 || deleting}
            onConfirm={deleteAccount}
          />
        </View>
      </Card>
    </Screen>
  );
}
