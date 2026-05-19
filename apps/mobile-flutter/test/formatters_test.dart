import 'package:flutter_test/flutter_test.dart';
import 'package:livoria_mobile_flutter/shared/formatters.dart';

void main() {
  test('formatCurrencyIDR formats rupiah without decimals', () {
    expect(formatCurrencyIDR(1250000), 'Rp1.250.000');
  });

  test('formatDateID formats Indonesian long date', () {
    expect(formatDateID(DateTime(2026, 5, 19)), '19 Mei 2026');
  });
}
