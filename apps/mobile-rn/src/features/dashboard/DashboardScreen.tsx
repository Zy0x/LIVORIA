import { createEmptyDashboardSummary } from '@livoria/core/contracts';
import { formatCurrencyIDR } from '@livoria/core/formatters';
import { theme } from '../../shared/theme';
import { Text, View } from 'react-native';

const placeholderSummary = createEmptyDashboardSummary('preview');

export function DashboardScreen() {
  return (
    <View style={{ gap: theme.spacing.md }}>
      <Text style={{ color: theme.colors.foreground, fontSize: 24, fontWeight: '800' }}>
        Dashboard
      </Text>
      <View style={{
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
      }}>
        <Text style={{ color: theme.colors.muted }}>Summary placeholder</Text>
        <Text style={{ color: theme.colors.foreground, fontSize: 30, fontWeight: '800' }}>
          {placeholderSummary.obatCount} Obat
        </Text>
        <Text style={{ color: theme.colors.muted }}>
          Tagihan estimasi: {formatCurrencyIDR(0)}
        </Text>
      </View>
    </View>
  );
}
