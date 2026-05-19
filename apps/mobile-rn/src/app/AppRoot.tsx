import { useState } from 'react';
import { SafeAreaView, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { AuthShell } from '../features/auth/AuthShell';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { ObatScreen } from '../features/obat/ObatScreen';
import { theme } from '../shared/theme';
import { routes, type MobileRoute } from './navigation';

function renderRoute(route: MobileRoute) {
  if (route === 'auth') return <AuthShell />;
  if (route === 'obat') return <ObatScreen />;
  return <DashboardScreen />;
}

export function AppRoot() {
  const [route, setRoute] = useState<MobileRoute>('dashboard');

  return (
    <SafeAreaView style={{ backgroundColor: theme.colors.background, flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{
        gap: theme.spacing.lg,
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
      }}>
        <View>
          <Text style={{ color: theme.colors.primary, fontSize: 30, fontWeight: '900' }}>
            LIVORIA
          </Text>
          <Text style={{ color: theme.colors.muted }}>
            React Native Android prototype
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {routes.map((item) => {
            const active = item.key === route;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setRoute(item.key)}
                style={{
                  backgroundColor: active ? theme.colors.primary : theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}
              >
                <Text style={{
                  color: active ? theme.colors.primaryForeground : theme.colors.foreground,
                  fontWeight: '700',
                }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {renderRoute(route)}
      </ScrollView>
    </SafeAreaView>
  );
}
