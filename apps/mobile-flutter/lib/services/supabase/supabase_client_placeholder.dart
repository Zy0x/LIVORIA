import 'supabase_config.dart';

class SupabaseClientPlaceholder {
  const SupabaseClientPlaceholder(this.config);

  final SupabaseConfig config;

  bool get isReady => config.isConfigured;
}
