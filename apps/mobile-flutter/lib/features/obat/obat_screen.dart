import 'package:flutter/material.dart';

import 'models/obat.dart';
import 'repositories/obat_repository.dart';

class ObatScreen extends StatelessWidget {
  const ObatScreen({
    required this.repository,
    super.key,
  });

  final ObatRepository repository;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Obat'),
      ),
      body: FutureBuilder<List<Obat>>(
        future: repository.listObat(),
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text('Gagal memuat obat: ${snapshot.error}'));
          }

          final items = snapshot.data ?? const <Obat>[];
          if (items.isEmpty) {
            return const Center(child: Text('Belum ada obat.'));
          }

          return ListView.separated(
            itemBuilder: (context, index) {
              final item = items[index];
              return ListTile(
                title: Text(item.name),
                subtitle: Text('${item.type} - ${item.dosage}'),
                trailing: Text(item.frequency),
              );
            },
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
          );
        },
      ),
    );
  }
}
