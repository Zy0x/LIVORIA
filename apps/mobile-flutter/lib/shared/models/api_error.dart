class ApiError {
  const ApiError({
    required this.code,
    required this.message,
    this.detail,
  });

  final String code;
  final String message;
  final String? detail;

  factory ApiError.fromJson(Map<String, Object?> json) {
    return ApiError(
      code: '${json['code'] ?? 'unknown'}',
      message: '${json['message'] ?? 'Terjadi kesalahan.'}',
      detail: json['detail'] == null ? null : '${json['detail']}',
    );
  }

  Map<String, Object?> toJson() {
    return {
      'code': code,
      'message': message,
      'detail': detail,
    };
  }
}
