import { formatCurrencyIDR, type DashboardSummary } from '@livoria/core';
import { theme } from '../../shared/theme';
import { Text, View } from 'react-native';

const placeholderSummary: DashboardSummary = {
  animeCount: 0,
  donghuaCount: 0,
  obatCount: 0,
  tagihanCount: 0,
  waifuCount: 0,
};

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
