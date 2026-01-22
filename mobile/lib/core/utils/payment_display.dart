// Payment display utilities
// Members see full amount, admins see 96% for completed payments (4% platform fee)

class PaymentDisplay {
  static const double transferFeePercentage = 0.01;
  static const double serviceFeePercentage = 0.03;
  static const double platformFeePercentage = transferFeePercentage + serviceFeePercentage;
  static const double netPercentage = 1 - platformFeePercentage;

  /// Get display amount for admins (shows 96% for completed payments)
  static double getDisplayAmount(dynamic amount, String? paymentStatus) {
    final numericAmount = amount is String ? double.tryParse(amount) ?? 0.0 : (amount as num?)?.toDouble() ?? 0.0;
    
    if (paymentStatus == 'completed') {
      return numericAmount * netPercentage;
    }
    
    return numericAmount;
  }

  /// Get platform fee amount
  static double getPlatformFee(dynamic amount) {
    final numericAmount = amount is String ? double.tryParse(amount) ?? 0.0 : (amount as num?)?.toDouble() ?? 0.0;
    return numericAmount * platformFeePercentage;
  }

  /// Get transfer fee amount
  static double getTransferFee(dynamic amount) {
    final numericAmount = amount is String ? double.tryParse(amount) ?? 0.0 : (amount as num?)?.toDouble() ?? 0.0;
    return numericAmount * transferFeePercentage;
  }

  /// Get service charge amount
  static double getServiceCharge(dynamic amount) {
    final numericAmount = amount is String ? double.tryParse(amount) ?? 0.0 : (amount as num?)?.toDouble() ?? 0.0;
    return numericAmount * serviceFeePercentage;
  }

  /// Calculate total display amount from a list of payments
  static double calculateTotalDisplayAmount(List<Map<String, dynamic>> payments) {
    return payments.fold(0.0, (sum, payment) {
      return sum + getDisplayAmount(
        payment['amount'],
        payment['payment_status'] as String?,
      );
    });
  }

  /// Calculate completed payments display amount
  static double calculateCompletedPaymentsDisplayAmount(List<Map<String, dynamic>> payments) {
    return payments
        .where((p) => p['payment_status'] == 'completed')
        .fold(0.0, (sum, payment) {
          final amount = payment['amount'];
          final numericAmount = amount is String 
              ? double.tryParse(amount) ?? 0.0 
              : (amount as num?)?.toDouble() ?? 0.0;
          return sum + numericAmount;
        });
  }

  /// Get member display amount (full amount, no fees deducted)
  static double getMemberDisplayAmount(dynamic amount) {
    return amount is String 
        ? double.tryParse(amount) ?? 0.0 
        : (amount as num?)?.toDouble() ?? 0.0;
  }
}
