String formatCurrencyIDR(num value) {
  final safeValue = value.isFinite ? value.round() : 0;
  final digits = safeValue.toString();
  final buffer = StringBuffer();

  for (var i = 0; i < digits.length; i += 1) {
    final remaining = digits.length - i;
    buffer.write(digits[i]);
    if (remaining > 1 && remaining % 3 == 1) {
      buffer.write('.');
    }
  }

  return 'Rp${buffer.toString()}';
}

String formatCompactIDR(num value) {
  final safeValue = value.isFinite ? value : 0;
  if (safeValue >= 1000000000) return '${(safeValue / 1000000000).toStringAsFixed(1)}M';
  if (safeValue >= 1000000) return '${(safeValue / 1000000).toStringAsFixed(1)}jt';
  if (safeValue >= 1000) return '${(safeValue / 1000).round()}rb';
  return safeValue.round().toString();
}

String formatDateID(DateTime? value) {
  if (value == null) return '-';
  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  return '${value.day} ${monthNames[value.month - 1]} ${value.year}';
}
