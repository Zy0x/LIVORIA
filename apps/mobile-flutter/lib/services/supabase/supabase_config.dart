class SupabaseConfig {
  const SupabaseConfig({
    required this.publishableKey,
    required this.url,
  });

  final String publishableKey;
  final String url;

  bool get isConfigured => url.isNotEmpty && publishableKey.isNotEmpty;

  factory SupabaseConfig.fromEnvironment() {
    return const SupabaseConfig(
      publishableKey: String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
      url: String.fromEnvironment('SUPABASE_URL'),
    );
  }
}
