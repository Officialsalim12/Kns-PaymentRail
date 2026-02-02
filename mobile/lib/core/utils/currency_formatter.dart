import 'package:intl/intl.dart';

class CurrencyFormatter {
  static String format(double amount) {
    return 'Le ${NumberFormat('#,##0.00').format(amount)}';
  }

  static String formatCompact(double amount) {
    return 'Le ${NumberFormat('#,##0').format(amount)}';
  }
}
