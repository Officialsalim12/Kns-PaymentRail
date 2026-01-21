import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/admin_provider.dart';
import 'payment_form_page.dart';

class PaymentManagementPage extends ConsumerStatefulWidget {
  const PaymentManagementPage({super.key});

  @override
  ConsumerState<PaymentManagementPage> createState() => _PaymentManagementPageState();
}

class _PaymentManagementPageState extends ConsumerState<PaymentManagementPage> {
  String? _deletingPaymentId;

  Future<void> _deletePayment(String paymentId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Payment'),
        content: const Text('Are you sure you want to delete this payment? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _deletingPaymentId = paymentId);
    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      final authAsync = ref.read(authProvider);
      final user = authAsync.value;
      if (user == null) throw Exception('User not found');

      final userProfile = await dataSource.getUserProfile(user.id);
      if (userProfile == null || userProfile['organization_id'] == null) {
        throw Exception('Organization not found');
      }

      // Get payment details before deleting
      final payments = await dataSource.getPayments(userProfile['organization_id']);
      final payment = payments.firstWhere((p) => p['id'] == paymentId);

      // Delete receipt generation logs first (foreign key constraint)
      try {
        await dataSource.deleteReceiptGenerationLogs(paymentId);
      } catch (e) {
        // Continue even if logs deletion fails
      }

      // Delete receipt if exists
      try {
        await dataSource.deleteReceipt(paymentId);
      } catch (e) {
        // Continue even if receipt deletion fails
      }

      // Delete payment
      await dataSource.deletePayment(paymentId);

      // Recalculate member's total_paid and balance from actual payments
      if (payment['member_id'] != null && payment['amount'] != null) {
        // Get all remaining payments for this member (after deletion)
        final remainingPayments = await dataSource.getPayments(
          userProfile['organization_id'],
          memberId: payment['member_id'],
        );

        // Filter only completed payments for total_paid calculation
        final completedPayments = remainingPayments.where((p) {
          final status = p['payment_status'] ?? p['status'];
          return status == 'completed' || status == null;
        }).toList();

        // Recalculate total_paid from actual completed payments
        double newTotalPaid = 0;
        for (var p in completedPayments) {
          final amount = (p['amount'] as num?)?.toDouble() ?? 0;
          newTotalPaid += amount;
        }

        // Recalculate unpaid_balance from payment descriptions
        double newBalance = 0;
        for (var p in remainingPayments) {
          final description = p['description'] as String?;
          if (description != null) {
            final regex = RegExp(r'\[BALANCE_ADDED:\s*([\d]+\.?[\d]*)\]', caseSensitive: false);
            final match = regex.firstMatch(description);
            if (match != null && match.group(1) != null) {
              final balanceAmount = double.tryParse(match.group(1)!);
              if (balanceAmount != null) {
                newBalance += balanceAmount;
              }
            }
          }
        }

        // Update member with recalculated values
        // Always update total_paid (even if 0), and try to update unpaid_balance
        final updateData = <String, dynamic>{
          'total_paid': newTotalPaid.clamp(0, double.infinity),
        };
        
        // Try to include unpaid_balance, but handle if column doesn't exist
        try {
          updateData['unpaid_balance'] = newBalance.clamp(0, double.infinity);
        } catch (e) {
          // Column might not exist, continue without it
          print('Warning: unpaid_balance column may not exist');
        }
        
        await dataSource.updateMember(payment['member_id'], updateData);
        
        print('Member totals recalculated: total_paid=$newTotalPaid, unpaid_balance=$newBalance');
      }

      if (mounted) {
        ref.invalidate(adminPaymentsProvider);
        ref.invalidate(adminMembersProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment deleted successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _deletingPaymentId = null);
      }
    }
  }

  Future<void> _downloadReceipt(String? pdfUrl) async {
    if (pdfUrl == null) return;
    
    try {
      final uri = Uri.parse(pdfUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not open receipt')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error opening receipt: ${e.toString()}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final paymentsAsync = ref.watch(adminPaymentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const PaymentFormPage(),
                ),
              );
              if (result == true) {
                ref.invalidate(adminPaymentsProvider);
              }
            },
            tooltip: 'Create Payment',
          ),
        ],
      ),
      body: paymentsAsync.when(
        data: (payments) {
          if (payments.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.payment, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'No payments yet',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Colors.grey[600],
                        ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () async {
                      final result = await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const PaymentFormPage(),
                        ),
                      );
                      if (result == true) {
                        ref.invalidate(adminPaymentsProvider);
                      }
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Create Payment'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(adminPaymentsProvider);
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: payments.length,
              itemBuilder: (context, index) {
                final payment = payments[index];
                final isDeleting = _deletingPaymentId == payment['id'];
                final member = payment['member'] as Map<String, dynamic>?;
                final receipt = payment['receipt'] as Map<String, dynamic>?;

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    title: Text(
                      CurrencyFormatter.format((payment['amount'] ?? 0).toDouble()),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (member != null)
                          Text(
                            '${member['full_name']} (${member['membership_id']})',
                            style: const TextStyle(fontWeight: FontWeight.w500),
                          ),
                        Text('Ref: ${payment['reference_number'] ?? 'N/A'}'),
                        Text(
                          'Date: ${DateFormat('MMM dd, yyyy').format(DateTime.parse(payment['payment_date'] ?? DateTime.now().toIso8601String()))}',
                        ),
                        Text('Method: ${payment['payment_method'] ?? 'N/A'}'),
                        if (payment['description'] != null &&
                            (payment['description'] as String).isNotEmpty)
                          Text(
                            payment['description'],
                            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                      ],
                    ),
                    trailing: PopupMenuButton(
                      itemBuilder: (context) => [
                        if (receipt != null && receipt['pdf_url'] != null)
                          PopupMenuItem(
                            child: const Row(
                              children: [
                                Icon(Icons.download, size: 18),
                                SizedBox(width: 8),
                                Text('Download Receipt'),
                              ],
                            ),
                            onTap: () => _downloadReceipt(receipt['pdf_url']),
                          ),
                        PopupMenuItem(
                          child: const Row(
                            children: [
                              Icon(Icons.delete, size: 18, color: Colors.red),
                              SizedBox(width: 8),
                              Text('Delete', style: TextStyle(color: Colors.red)),
                            ],
                          ),
                          onTap: () => _deletePayment(payment['id']),
                        ),
                      ],
                    ),
                    isThreeLine: true,
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
              const SizedBox(height: 16),
              const Text('Error loading payments'),
              const SizedBox(height: 8),
              Text(error.toString()),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => ref.invalidate(adminPaymentsProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

