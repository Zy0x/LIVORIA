import 'package:flutter/material.dart';

import '../features/dashboard/dashboard_screen.dart';
import '../features/obat/obat_screen.dart';
import '../features/obat/repositories/obat_repository.dart';
import '../features/obat/repositories/placeholder_obat_repository.dart';
import '../services/supabase/supabase_config.dart';
import '../shared/theme.dart';
import 'app_routes.dart';

class LivoriaApp extends StatelessWidget {
  const LivoriaApp({
    required this.supabaseConfig,
    super.key,
  });

  final SupabaseConfig supabaseConfig;

  @override
  Widget build(BuildContext context) {
    final ObatRepository obatRepository = PlaceholderObatRepository();

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      routes: {
        AppRoutes.dashboard: (_) => DashboardScreen(
              supabaseConfig: supabaseConfig,
            ),
        AppRoutes.obat: (_) => ObatScreen(
              repository: obatRepository,
            ),
      },
      theme: livoriaTheme,
    );
  }
}
