import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/member_provider.dart';
import '../widgets/payment_history_list.dart';

class MemberPaymentHistoryPage extends ConsumerWidget {
  const MemberPaymentHistoryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final paymentsAsync = ref.watch(memberPaymentsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Payment History',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: const Color(0xFF0F172A),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(memberPaymentsProvider);
        },
        child: paymentsAsync.when(
          data: (payments) => payments.isEmpty
              ? const Center(child: Text('No payment history found.'))
              : ListView(
                  padding: const EdgeInsets.all(24),
                  children: [
                    PaymentHistoryList(payments: payments),
                  ],
                ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(child: Text('Error: $err')),
        ),
      ),
    );
  }
}
