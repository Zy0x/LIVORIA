class DashboardSummary {
  const DashboardSummary({
    required this.tagihanCount,
    required this.animeCount,
    required this.donghuaCount,
    required this.waifuCount,
    required this.obatCount,
  });

  final int tagihanCount;
  final int animeCount;
  final int donghuaCount;
  final int waifuCount;
  final int obatCount;

  factory DashboardSummary.fromJson(Map<String, Object?> json) {
    return DashboardSummary(
      tagihanCount: _toInt(json['tagihanCount'] ?? json['tagihan_count']),
      animeCount: _toInt(json['animeCount'] ?? json['anime_count']),
      donghuaCount: _toInt(json['donghuaCount'] ?? json['donghua_count']),
      waifuCount: _toInt(json['waifuCount'] ?? json['waifu_count']),
      obatCount: _toInt(json['obatCount'] ?? json['obat_count']),
    );
  }

  Map<String, Object?> toJson() {
    return {
      'tagihanCount': tagihanCount,
      'animeCount': animeCount,
      'donghuaCount': donghuaCount,
      'waifuCount': waifuCount,
      'obatCount': obatCount,
    };
  }
}

int _toInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? 0;
}
