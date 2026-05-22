import type { ObatItem } from '@livoria/core/domain';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { listObat } from '../../services/supabase/obat.repository';
import { theme } from '../../shared/theme';

function ObatCard({ item }: { item: ObatItem }) {
  return (
    <View style={{
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      gap: 4,
      padding: theme.spacing.md,
    }}>
      <Text style={{ color: theme.colors.foreground, fontSize: 17, fontWeight: '700' }}>
        {item.name}
      </Text>
      <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
        {item.type} - {item.dosage || 'Tanpa dosis'}
      </Text>
      <Text style={{ color: theme.colors.muted }}>
        {item.frequency || item.usage_info || 'Belum ada catatan penggunaan.'}
      </Text>
    </View>
  );
}

export function ObatScreen() {
  const [items, setItems] = useState<ObatItem[]>([]);
  const [source, setSource] = useState<'placeholder' | 'supabase'>('placeholder');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listObat()
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setSource(result.source);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Gagal memuat obat.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <ActivityIndicator color={theme.colors.primary} />;
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View>
        <Text style={{ color: theme.colors.foreground, fontSize: 24, fontWeight: '800' }}>
          Obat
        </Text>
        <Text style={{ color: theme.colors.muted }}>
          Sumber: {source}
        </Text>
      </View>
      {error ? <Text style={{ color: theme.colors.warning }}>{error}</Text> : null}
      <FlatList
        contentContainerStyle={{ gap: theme.spacing.sm }}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ObatCard item={item} />}
        scrollEnabled={false}
      />
    </View>
  );
}
