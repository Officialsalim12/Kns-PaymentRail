import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/member_provider.dart';
import '../../../../core/utils/currency_formatter.dart';
import 'package:url_launcher/url_launcher.dart';

class MemberReceiptsPage extends ConsumerWidget {
  const MemberReceiptsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final paymentsAsync = ref.watch(memberPaymentsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('My Receipts',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: const Color(0xFF0F172A),
      ),
      body: paymentsAsync.when(
        data: (payments) {
          final receipts = payments.where((p) => p['receipt'] != null).toList();

          if (receipts.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.receipt_long_rounded,
                      size: 64, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  const Text('No receipts found.',
                      style: TextStyle(color: Colors.blueGrey)),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(24),
            itemCount: receipts.length,
            itemBuilder: (context, index) {
              final payment = receipts[index];
              final receipt = payment['receipt'];
              final amount = (payment['amount'] as num?)?.toDouble() ?? 0.0;
              final date = DateTime.parse(
                  payment['payment_date'] ?? DateTime.now().toIso8601String());

              return Container(
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.blueGrey.shade50),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.02),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  leading: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child:
                        const Icon(Icons.receipt_rounded, color: Colors.green),
                  ),
                  title: Text(
                    'Receipt #${receipt['receipt_number'] ?? 'N/A'}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(
                    '${DateFormat('MMM dd, yyyy').format(date)} • ${CurrencyFormatter.format(amount)}',
                    style:
                        const TextStyle(fontSize: 12, color: Colors.blueGrey),
                  ),
                  trailing: IconButton(
                    icon:
                        const Icon(Icons.download_rounded, color: Colors.blue),
                    onPressed: () async {
                      final url = receipt['pdf_url'];
                      if (url != null && await canLaunchUrl(Uri.parse(url))) {
                        await launchUrl(Uri.parse(url));
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                              content: Text('Could not open receipt URL.')),
                        );
                      }
                    },
                  ),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
      ),
    );
  }
}
