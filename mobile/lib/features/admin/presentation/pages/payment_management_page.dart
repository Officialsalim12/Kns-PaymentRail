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
  ConsumerState<PaymentManagementPage> createState() =>
      _PaymentManagementPageState();
}

class _PaymentManagementPageState extends ConsumerState<PaymentManagementPage> {
  String? _deletingPaymentId;

  Future<void> _deletePayment(String paymentId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Payment'),
        content: const Text(
            'Are you sure you want to delete this payment? This action cannot be undone.'),
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
      final payments =
          await dataSource.getPayments(userProfile['organization_id']);
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
            final regex = RegExp(r'\[BALANCE_ADDED:\s*([\d]+\.?[\d]*)\]',
                caseSensitive: false);
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

        print(
            'Member totals recalculated: total_paid=$newTotalPaid, unpaid_balance=$newBalance');
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
      backgroundColor: const Color(0xFFF8FAFC),
      body: paymentsAsync.when(
        data: (payments) {
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(adminPaymentsProvider);
            },
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          const Color(0xFF0F172A),
                          const Color(0xFF1E293B),
                        ],
                      ),
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(32),
                        bottomRight: Radius.circular(32),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F172A).withOpacity(0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    padding: EdgeInsets.fromLTRB(
                      24,
                      MediaQuery.of(context).padding.top + 20,
                      24,
                      40,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            IconButton(
                              onPressed: () => Navigator.pop(context),
                              icon: const Icon(Icons.arrow_back_ios_new_rounded,
                                  color: Colors.white, size: 20),
                              style: IconButton.styleFrom(
                                backgroundColor: Colors.white.withOpacity(0.1),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                            const Spacer(),
                            ElevatedButton.icon(
                              onPressed: () async {
                                final result = await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) =>
                                        const PaymentFormPage(),
                                  ),
                                );
                                if (result == true) {
                                  ref.invalidate(adminPaymentsProvider);
                                }
                              },
                              icon: const Icon(Icons.add_rounded, size: 18),
                              label: const Text('New Payment',
                                  style:
                                      TextStyle(fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0284C7),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 8),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12)),
                                elevation: 0,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 32),
                        const Text(
                          'Payment Ledger',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -1,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Transactions across your network',
                          style: TextStyle(
                            color: Colors.blueGrey.shade400,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(24, 32, 24, 48),
                  sliver: payments.isEmpty
                      ? SliverFillRemaining(
                          hasScrollBody: false,
                          child: _buildEmptyState(),
                        )
                      : SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final payment = payments[index];
                              return _buildPaymentListItem(payment);
                            },
                            childCount: payments.length,
                          ),
                        ),
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded,
                  size: 64, color: Colors.red),
              const SizedBox(height: 16),
              const Text('Failed to load ledger',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 8),
              Text(error.toString(), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => ref.invalidate(adminPaymentsProvider),
                child: const Text('Try Again'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.payments_rounded, size: 80, color: Colors.blueGrey.shade200),
        const SizedBox(height: 24),
        const Text(
          'No transactions found',
          style: TextStyle(
              color: Colors.blueGrey,
              fontSize: 16,
              fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Text(
          'Any payments created will appear here.',
          style: TextStyle(color: Colors.blueGrey.shade400, fontSize: 14),
        ),
      ],
    );
  }

  Widget _buildPaymentListItem(Map<String, dynamic> payment) {
    final status = payment['payment_status'] ?? payment['status'] ?? 'pending';
    final amount = (payment['amount'] ?? 0).toDouble();
    // Handle potential list response from joined tables
    final memberData = payment['member'];
    final member = (memberData is List && memberData.isNotEmpty)
        ? memberData.first as Map<String, dynamic>
        : (memberData is Map<String, dynamic> ? memberData : null);

    final receiptData = payment['receipt'];
    final receipt = (receiptData is List && receiptData.isNotEmpty)
        ? receiptData.first as Map<String, dynamic>
        : (receiptData is Map<String, dynamic> ? receiptData : null);
    final date = DateTime.parse(
        payment['payment_date'] ?? DateTime.now().toIso8601String());

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.blueGrey.shade100),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {},
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _getStatusColor(status).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        status == 'completed'
                            ? Icons.check_circle_rounded
                            : status == 'failed'
                                ? Icons.error_rounded
                                : Icons.pending_rounded,
                        color: _getStatusColor(status),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            member?['full_name'] ?? 'Unknown Member',
                            style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: Color(0xFF0F172A)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Ref: ${payment['reference_number'] ?? 'N/A'}',
                            style: TextStyle(
                                color: Colors.blueGrey.shade500,
                                fontSize: 12,
                                fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          CurrencyFormatter.format(amount),
                          style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 17,
                              color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          DateFormat('MMM dd, yyyy').format(date),
                          style: TextStyle(
                              color: Colors.blueGrey.shade400, fontSize: 11),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(height: 1),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.blueGrey.shade50,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        (payment['payment_method'] ?? 'N/A')
                            .toString()
                            .toUpperCase(),
                        style: TextStyle(
                            color: Colors.blueGrey.shade600,
                            fontSize: 10,
                            fontWeight: FontWeight.bold),
                      ),
                    ),
                    const Spacer(),
                    if (receipt != null && receipt['pdf_url'] != null)
                      _buildSmallIconButton(
                        icon: Icons.file_download_rounded,
                        onTap: () => _downloadReceipt(receipt['pdf_url']),
                        color: const Color(0xFF0284C7),
                      ),
                    const SizedBox(width: 8),
                    _buildSmallIconButton(
                      icon: Icons.delete_outline_rounded,
                      onTap: () => _deletePayment(payment['id']),
                      color: Colors.red.shade400,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSmallIconButton(
      {required IconData icon,
      required VoidCallback onTap,
      required Color color}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 18, color: color),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'completed':
        return Colors.green;
      case 'failed':
        return Colors.red;
      case 'processing':
        return Colors.orange;
      default:
        return Colors.blueGrey;
    }
  }
}
