class Obat {
  const Obat({
    required this.id,
    required this.name,
    required this.type,
    required this.dosage,
    required this.usageInfo,
    required this.frequency,
    this.createdAt,
    this.notes,
    this.sideEffects,
    this.userId,
  });

  final String id;
  final String? userId;
  final String name;
  final String type;
  final String dosage;
  final String usageInfo;
  final String frequency;
  final String? sideEffects;
  final String? notes;
  final DateTime? createdAt;

  factory Obat.fromJson(Map<String, Object?> json) {
    return Obat(
      id: '${json['id'] ?? ''}',
      userId: json['user_id'] == null ? null : '${json['user_id']}',
      name: '${json['name'] ?? ''}',
      type: '${json['type'] ?? 'Lainnya'}',
      dosage: '${json['dosage'] ?? ''}',
      usageInfo: '${json['usage_info'] ?? ''}',
      frequency: '${json['frequency'] ?? ''}',
      sideEffects: json['side_effects'] == null ? null : '${json['side_effects']}',
      notes: json['notes'] == null ? null : '${json['notes']}',
      createdAt: DateTime.tryParse('${json['created_at'] ?? ''}'),
    );
  }

  Map<String, Object?> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'type': type,
      'dosage': dosage,
      'usage_info': usageInfo,
      'frequency': frequency,
      'side_effects': sideEffects,
      'notes': notes,
      'created_at': createdAt?.toIso8601String(),
    };
  }
}
