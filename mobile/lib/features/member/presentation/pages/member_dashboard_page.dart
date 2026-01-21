import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../providers/member_provider.dart';
import '../widgets/member_stats_card.dart';
import '../widgets/payment_history_list.dart';
import '../widgets/notifications_list.dart';
import '../widgets/member_payment_form.dart';

class MemberDashboardPage extends ConsumerStatefulWidget {
  const MemberDashboardPage({super.key});

  @override
  ConsumerState<MemberDashboardPage> createState() => _MemberDashboardPageState();
}

class _MemberDashboardPageState extends ConsumerState<MemberDashboardPage> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _membershipIdController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  bool _isCreatingMember = false;

  @override
  void dispose() {
    _fullNameController.dispose();
    _membershipIdController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _createMember() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isCreatingMember = true);

    try {
      final authAsync = ref.read(authProvider);
      final user = authAsync.value;
      if (user == null) {
        throw Exception('User not found');
      }

      final dataSource = ref.read(supabaseDataSourceProvider);
      final userProfile = await dataSource.getUserProfile(user.id);
      if (userProfile == null) {
        throw Exception('User profile not found. Please contact an administrator to create your user profile in the system.');
      }
      if (userProfile['organization_id'] == null) {
        throw Exception('Your user account is not linked to an organization. Please contact an administrator to link your account to an organization.');
      }
      await dataSource.createMember({
        'user_id': user.id,
        'organization_id': userProfile['organization_id'],
        'full_name': _fullNameController.text.trim(),
        'membership_id': _membershipIdController.text.trim(),
        'email': user.email,
        'phone_number': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        'address': _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        'status': 'pending',
        'unpaid_balance': 0.00,
        'total_paid': 0.00,
      });

      ref.invalidate(memberProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Member profile created successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error creating member: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isCreatingMember = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final memberAsync = ref.watch(memberProvider);
    final paymentsAsync = ref.watch(memberPaymentsProvider);
    final notificationsAsync = ref.watch(memberNotificationsProvider);
    final tabsAsync = ref.watch(memberTabsProvider);

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Theme.of(context).colorScheme.primary,
        title: Text(
          'KNS MultiRail',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.primary,
                letterSpacing: -0.5,
              ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: IconButton(
              icon: const Icon(Icons.logout_outlined, size: 22),
              tooltip: 'Sign Out',
              onPressed: () async {
                await ref.read(authProvider.notifier).signOut();
              },
            ),
          ),
        ],
      ),
      body: memberAsync.when(
        data: (member) {
          if (member == null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 64,
                      color: Colors.orange[400],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Member Profile Not Found',
                      style: Theme.of(context).textTheme.headlineSmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Your member profile has not been created yet. Please contact your organization administrator or register through the membership registration page.',
                      style: Theme.of(context).textTheme.bodyMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: () {
                        context.push('/member-register');
                      },
                      icon: const Icon(Icons.person_add),
                      label: const Text('Go to Registration'),
                    ),
                  ],
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(memberProvider);
              ref.invalidate(memberPaymentsProvider);
              ref.invalidate(memberNotificationsProvider);
              ref.invalidate(memberTabsProvider);
            },
            child: LayoutBuilder(
              builder: (context, constraints) {
                final padding = constraints.maxWidth > 600 ? 24.0 : 16.0;
                return SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: EdgeInsets.all(padding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Card(
                    elevation: 2,
                    shadowColor: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: BorderSide(
                        color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                        width: 1,
                      ),
                    ),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            Theme.of(context).colorScheme.primary.withOpacity(0.12),
                            Theme.of(context).colorScheme.primary.withOpacity(0.05),
                          ],
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Row(
                          children: [
                            Container(
                              width: 64,
                              height: 64,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: [
                                    Theme.of(context).colorScheme.primary,
                                    Theme.of(context).colorScheme.primary.withOpacity(0.7),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                                    blurRadius: 8,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.person_rounded,
                                color: Colors.white,
                                size: 32,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    member['full_name'] ?? 'N/A',
                                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                          fontWeight: FontWeight.bold,
                                          letterSpacing: -0.5,
                                        ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'ID: ${member['membership_id'] ?? 'N/A'}',
                                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                                        ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: member['status'] == 'active'
                                    ? Theme.of(context).colorScheme.primary.withOpacity(0.15)
                                    : Theme.of(context).colorScheme.tertiary.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: member['status'] == 'active'
                                      ? Theme.of(context).colorScheme.primary.withOpacity(0.3)
                                      : Theme.of(context).colorScheme.tertiary.withOpacity(0.3),
                                  width: 1.5,
                                ),
                              ),
                              child: Text(
                                (member['status'] ?? 'N/A').toString().toUpperCase(),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.5,
                                  color: member['status'] == 'active'
                                      ? Theme.of(context).colorScheme.primary
                                      : Theme.of(context).colorScheme.tertiary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final isSmallScreen = constraints.maxWidth < 400;
                      return Row(
                        children: [
                          Expanded(
                            child: MemberStatsCard(
                              title: 'Status',
                              value: (member['status'] ?? 'N/A').toString().toUpperCase(),
                              icon: Icons.check_circle,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                          SizedBox(width: isSmallScreen ? 8 : 12),
                          Expanded(
                        child: paymentsAsync.when(
                          data: (payments) {
                            double totalPaid = 0;
                            for (var p in payments) {
                              final status = p['payment_status'] ?? p['status'];
                              if (status == 'completed' || status == null) {
                                totalPaid += (p['amount'] as num?)?.toDouble() ?? 0;
                              }
                            }
                            
                            return MemberStatsCard(
                              title: 'Total Paid',
                              value: CurrencyFormatter.format(totalPaid),
                              icon: Icons.payments,
                              color: Theme.of(context).colorScheme.secondary,
                            );
                          },
                          loading: () => MemberStatsCard(
                            title: 'Total Paid',
                            value: CurrencyFormatter.format((member['total_paid'] ?? 0).toDouble()),
                            icon: Icons.payments,
                            color: Theme.of(context).colorScheme.secondary,
                          ),
                          error: (_, __) => MemberStatsCard(
                            title: 'Total Paid',
                            value: CurrencyFormatter.format((member['total_paid'] ?? 0).toDouble()),
                            icon: Icons.payments,
                            color: Theme.of(context).colorScheme.secondary,
                          ),
                        ),
                      ),
                    ],
                  );
                    },
                  ),
                  const SizedBox(height: 12),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final isSmallScreen = constraints.maxWidth < 400;
                      return Row(
                        children: [
                          Expanded(
                            child: MemberStatsCard(
                              title: 'Unpaid Balance',
                              value: CurrencyFormatter.format((member['unpaid_balance'] ?? 0).toDouble()),
                              icon: Icons.account_balance_wallet,
                              color: Theme.of(context).colorScheme.tertiary,
                            ),
                          ),
                          SizedBox(width: isSmallScreen ? 8 : 12),
                          Expanded(
                        child: paymentsAsync.when(
                          data: (payments) => MemberStatsCard(
                            title: 'Last Payment',
                            value: payments.isNotEmpty
                                ? DateFormat('MMM dd').format(
                                    DateTime.parse(
                                      payments[0]['payment_date'] ?? DateTime.now().toIso8601String(),
                                    ),
                                  )
                                : 'N/A',
                            icon: Icons.calendar_today,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                          loading: () => MemberStatsCard(
                            title: 'Last Payment',
                            value: '...',
                            icon: Icons.calendar_today,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                          error: (_, __) => MemberStatsCard(
                            title: 'Last Payment',
                            value: 'N/A',
                            icon: Icons.calendar_today,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                      ),
                    ],
                  );
                    },
                  ),
                  const SizedBox(height: 24),
                  tabsAsync.when(
                    data: (tabs) {
                      if (tabs.isEmpty) {
                        return const SizedBox.shrink();
                      }
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  Icons.payment_rounded,
                                  color: Theme.of(context).colorScheme.primary,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Payment & Donation Options',
                                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                            fontWeight: FontWeight.bold,
                                            letterSpacing: -0.3,
                                          ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Select an option to make a payment or donation',
                                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          LayoutBuilder(
                            builder: (context, constraints) {
                              final crossAxisCount = constraints.maxWidth > 600 ? 3 : 2;
                              final spacing = constraints.maxWidth > 600 ? 16.0 : 12.0;
                              return GridView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: crossAxisCount,
                                  crossAxisSpacing: spacing,
                                  mainAxisSpacing: spacing,
                                  childAspectRatio: constraints.maxWidth > 600 ? 1.3 : 1.2,
                                ),
                            itemCount: tabs.length,
                            itemBuilder: (context, index) {
                              final tab = tabs[index];
                              final tabType = tab['tab_type'] ?? 'payment';
                              final tabName = tab['tab_name'] ?? 'Unnamed Tab';
                              final description = tab['description'] as String?;

                              final isPayment = tabType == 'payment';
                              final cardColor = isPayment 
                                  ? Theme.of(context).colorScheme.primary
                                  : Theme.of(context).colorScheme.secondary;
                              
                              return Card(
                                elevation: 2,
                                shadowColor: cardColor.withOpacity(0.15),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(18),
                                  side: BorderSide(
                                    color: cardColor.withOpacity(0.2),
                                    width: 1.5,
                                  ),
                                ),
                                child: InkWell(
                                  onTap: () {
                                    showDialog(
                                      context: context,
                                      builder: (context) => MemberPaymentForm(
                                        memberId: member['id'],
                                        tabName: tabName,
                                        tabType: tabType,
                                        monthlyCost: tab['monthly_cost'] != null 
                                            ? (tab['monthly_cost'] as num).toDouble() 
                                            : null,
                                      ),
                                    ).then((_) {
                                      ref.invalidate(memberProvider);
                                      ref.invalidate(memberPaymentsProvider);
                                    });
                                  },
                                  borderRadius: BorderRadius.circular(18),
                                  child: Container(
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(18),
                                      gradient: LinearGradient(
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                        colors: [
                                          cardColor.withOpacity(0.12),
                                          cardColor.withOpacity(0.06),
                                        ],
                                      ),
                                    ),
                                    child: Padding(
                                      padding: const EdgeInsets.all(16),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      tabName,
                                                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                                            fontWeight: FontWeight.bold,
                                                            fontSize: 15,
                                                            letterSpacing: -0.2,
                                                          ),
                                                      maxLines: 2,
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(
                                                      horizontal: 8,
                                                      vertical: 4,
                                                    ),
                                                    decoration: BoxDecoration(
                                                      color: cardColor.withOpacity(0.2),
                                                      borderRadius: BorderRadius.circular(6),
                                                      border: Border.all(
                                                        color: cardColor.withOpacity(0.3),
                                                        width: 1,
                                                      ),
                                                    ),
                                                    child: Text(
                                                      tabType == 'payment' ? 'PAY' : 'DONATE',
                                                      style: TextStyle(
                                                        fontSize: 9,
                                                        fontWeight: FontWeight.bold,
                                                        letterSpacing: 0.5,
                                                        color: cardColor,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              if (description != null && description.isNotEmpty) ...[
                                                const SizedBox(height: 8),
                                                Text(
                                                  description,
                                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                                                        fontSize: 12,
                                                      ),
                                                  maxLines: 2,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ],
                                            ],
                                          ),
                                          const SizedBox(height: 12),
                                          Container(
                                            width: double.infinity,
                                            padding: const EdgeInsets.symmetric(vertical: 12),
                                            decoration: BoxDecoration(
                                              gradient: LinearGradient(
                                                begin: Alignment.topLeft,
                                                end: Alignment.bottomRight,
                                                colors: [
                                                  cardColor,
                                                  cardColor.withOpacity(0.8),
                                                ],
                                              ),
                                              borderRadius: BorderRadius.circular(10),
                                              boxShadow: [
                                                BoxShadow(
                                                  color: cardColor.withOpacity(0.3),
                                                  blurRadius: 8,
                                                  offset: const Offset(0, 4),
                                                ),
                                              ],
                                            ),
                                            child: Text(
                                              tabType == 'payment' ? 'Pay Now' : 'Donate Here',
                                              textAlign: TextAlign.center,
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 13,
                                                letterSpacing: 0.3,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            },
                          );
                            },
                          ),
                          const SizedBox(height: 24),
                        ],
                      );
                    },
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                  ),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Icons.history_rounded,
                          color: Theme.of(context).colorScheme.primary,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'Payment History',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                              letterSpacing: -0.3,
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  paymentsAsync.when(
                    data: (payments) => PaymentHistoryList(payments: payments),
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (error, stack) => Text('Error: $error'),
                  ),
                  const SizedBox(height: 24),
                  notificationsAsync.when(
                    data: (notifications) {
                      final unreadCount = notifications.where((n) => !(n['is_read'] ?? false)).length;
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Icon(
                                      Icons.notifications_rounded,
                                      color: Theme.of(context).colorScheme.primary,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    'Notifications',
                                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                          fontWeight: FontWeight.bold,
                                          letterSpacing: -0.3,
                                        ),
                                  ),
                                ],
                              ),
                              if (unreadCount > 0)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.red,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    '$unreadCount new',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          NotificationsList(notifications: notifications),
                        ],
                      );
                    },
                    loading: () => Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Notifications',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 12),
                        const Center(child: CircularProgressIndicator()),
                      ],
                    ),
                    error: (error, stack) => Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Notifications',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 12),
                        Text('Error: $error'),
                      ],
                    ),
                  ),
                ],
              ),
            );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.error_outline,
                  size: 64,
                  color: Colors.red[300],
                ),
                const SizedBox(height: 16),
                Text(
                  'Error Loading Member Data',
                  style: Theme.of(context).textTheme.headlineSmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  error.toString(),
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    ref.invalidate(memberProvider);
                  },
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


