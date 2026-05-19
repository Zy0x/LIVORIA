import '../models/obat.dart';
import 'obat_repository.dart';

class PlaceholderObatRepository implements ObatRepository {
  @override
  Future<List<Obat>> listObat() async {
    return const [
      Obat(
        id: 'prototype-paracetamol',
        name: 'Paracetamol',
        type: 'Analgesik',
        dosage: '500 mg',
        usageInfo: 'Placeholder contract Flutter.',
        frequency: 'Jika perlu',
      ),
      Obat(
        id: 'prototype-vitamin-c',
        name: 'Vitamin C',
        type: 'Vitamin',
        dosage: '500 mg',
        usageInfo: 'Data contoh sebelum Supabase Dart adapter dipasang.',
        frequency: '1x sehari',
      ),
    ];
  }
}
