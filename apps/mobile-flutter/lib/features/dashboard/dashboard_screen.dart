import 'package:flutter/material.dart';

import '../../app/app_routes.dart';
import '../../services/supabase/supabase_config.dart';
import '../../shared/formatters.dart';
import '../../shared/models/dashboard_summary.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({
    required this.supabaseConfig,
    super.key,
  });

  final SupabaseConfig supabaseConfig;

  static const summary = DashboardSummary(
    animeCount: 0,
    donghuaCount: 0,
    obatCount: 0,
    tagihanCount: 0,
    waifuCount: 0,
  );

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('LIVORIA Flutter'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Dashboard Contract Prototype',
            style: theme.textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Supabase: ${supabaseConfig.isConfigured ? 'configured' : 'placeholder'}',
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _MetricCard(label: 'Tagihan', value: summary.tagihanCount),
              _MetricCard(label: 'Anime', value: summary.animeCount),
              _MetricCard(label: 'Donghua', value: summary.donghuaCount),
              _MetricCard(label: 'Waifu', value: summary.waifuCount),
              _MetricCard(label: 'Obat', value: summary.obatCount),
            ],
          ),
          const SizedBox(height: 16),
          Text('Total placeholder: ${formatCurrencyIDR(0)}'),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => Navigator.of(context).pushNamed(AppRoutes.obat),
            child: const Text('Buka Obat'),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
  });

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 150,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label),
              const SizedBox(height: 8),
              Text(
                value.toString(),
                style: Theme.of(context).textTheme.headlineMedium,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
