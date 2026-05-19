import { getMobileSupabaseEnv } from '../../services/supabase/env';
import { theme } from '../../shared/theme';
import { Text, View } from 'react-native';

export function AuthShell() {
  const env = getMobileSupabaseEnv();

  return (
    <View style={{
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    }}>
      <Text style={{ color: theme.colors.foreground, fontSize: 18, fontWeight: '700' }}>
        Auth Shell
      </Text>
      <Text style={{ color: theme.colors.muted, lineHeight: 20 }}>
        Prototype ini belum mengaktifkan form login. Supabase mobile client sudah siap memakai env publik Expo/Vite.
      </Text>
      <Text style={{ color: env.isConfigured ? theme.colors.success : theme.colors.warning, fontWeight: '600' }}>
        Supabase: {env.isConfigured ? 'configured' : 'placeholder mode'}
      </Text>
    </View>
  );
}
