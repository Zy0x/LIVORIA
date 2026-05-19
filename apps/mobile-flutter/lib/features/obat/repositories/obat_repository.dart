import '../models/obat.dart';

abstract interface class ObatRepository {
  Future<List<Obat>> listObat();
}
