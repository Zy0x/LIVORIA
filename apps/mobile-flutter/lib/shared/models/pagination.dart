class Pagination {
  const Pagination({
    required this.page,
    required this.pageSize,
    required this.total,
  });

  final int page;
  final int pageSize;
  final int total;

  factory Pagination.fromJson(Map<String, Object?> json) {
    return Pagination(
      page: _toInt(json['page']),
      pageSize: _toInt(json['pageSize'] ?? json['page_size']),
      total: _toInt(json['total']),
    );
  }

  Map<String, Object?> toJson() {
    return {
      'page': page,
      'pageSize': pageSize,
      'total': total,
    };
  }
}

class PaginatedResult<T> {
  const PaginatedResult({
    required this.data,
    required this.pagination,
  });

  final List<T> data;
  final Pagination pagination;
}

int _toInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? 0;
}
