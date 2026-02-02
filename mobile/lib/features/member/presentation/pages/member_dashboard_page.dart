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
import '../../../../core/presentation/widgets/main_drawer.dart';

class MemberDashboardPage extends ConsumerStatefulWidget {
  const MemberDashboardPage({super.key});

  @override
  ConsumerState<MemberDashboardPage> createState() =>
      _MemberDashboardPageState();
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
        throw Exception(
            'User profile not found. Please contact an administrator to create your user profile in the system.');
      }
      if (userProfile['organization_id'] == null) {
        throw Exception(
            'Your user account is not linked to an organization. Please contact an administrator to link your account to an organization.');
      }
      await dataSource.createMember({
        'user_id': user.id,
        'organization_id': userProfile['organization_id'],
        'full_name': _fullNameController.text.trim(),
        'membership_id': _membershipIdController.text.trim(),
        'email': user.email,
        'phone_number': _phoneController.text.trim().isEmpty
            ? null
            : _phoneController.text.trim(),
        'address': _addressController.text.trim().isEmpty
            ? null
            : _addressController.text.trim(),
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
      drawer: memberAsync.when(
        data: (member) => MainDrawer(
          role: 'member',
          organizationName: member?['organization_name'] ?? 'Member Portal',
        ),
        loading: () => null,
        error: (_, __) => const MainDrawer(role: 'member'),
      ),
      body: memberAsync.when(
        data: (member) {
          if (member == null) {
            return const Center(child: Text('Member details not found'));
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(memberProvider);
              ref.invalidate(memberPaymentsProvider);
              ref.invalidate(memberNotificationsProvider);
              ref.invalidate(memberTabsProvider);
            },
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Theme.of(context).colorScheme.primary,
                          const Color(0xFF1E40AF), // Deeper blue
                        ],
                      ),
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(32),
                        bottomRight: Radius.circular(32),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Theme.of(context)
                              .colorScheme
                              .primary
                              .withOpacity(0.3),
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
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'KnsPaymentRail',
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleLarge
                                      ?.copyWith(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: -0.5,
                                      ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(4),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withOpacity(0.2),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.auto_awesome,
                                          size: 12, color: Colors.white),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Member Dashboard',
                                      style: TextStyle(
                                        color: Colors.white.withOpacity(0.8),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            Builder(
                              builder: (context) => IconButton(
                                onPressed: () =>
                                    Scaffold.of(context).openDrawer(),
                                icon: const Icon(Icons.menu_rounded,
                                    color: Colors.white),
                                style: IconButton.styleFrom(
                                  backgroundColor:
                                      Colors.white.withOpacity(0.15),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 40),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(3),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(17),
                                child: Container(
                                  width: 60,
                                  height: 60,
                                  color: Colors.white,
                                  child: Icon(Icons.person_rounded,
                                      size: 36,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .primary),
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    member['full_name'] ?? 'N/A',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 24,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'ID: ${member['membership_id'] ?? 'N/A'}',
                                    style: TextStyle(
                                      color: Colors.white.withOpacity(0.7),
                                      fontWeight: FontWeight.w500,
                                      letterSpacing: 1.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                    color: Colors.white.withOpacity(0.3)),
                              ),
                              child: Text(
                                (member['status'] ?? 'pending')
                                    .toString()
                                    .toUpperCase(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                SliverPadding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      // Quick Actions Row
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _buildQuickAction(
                                context,
                                'Receipts',
                                Icons.receipt_long_rounded,
                                () => context.push('/member/receipts')),
                            const SizedBox(width: 12),
                            _buildQuickAction(
                                context,
                                'History',
                                Icons.history_rounded,
                                () => context.push('/member/history')),
                            const SizedBox(width: 12),
                            _buildQuickAction(
                                context,
                                'Profile',
                                Icons.person_rounded,
                                () => context.push('/profile')),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Metrics Section - Row 1
                      Row(
                        children: [
                          Expanded(
                            child: _buildMetricCard(
                              context,
                              'Status',
                              (member['status'] ?? 'pending')
                                  .toString()
                                  .toUpperCase(),
                              Icons.check_circle_rounded,
                              Colors.blue.shade600,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: paymentsAsync.when(
                              data: (payments) {
                                double totalPaid = 0;
                                for (var p in payments) {
                                  final status =
                                      p['payment_status'] ?? p['status'];
                                  if (status == 'completed') {
                                    totalPaid +=
                                        (p['amount'] as num?)?.toDouble() ?? 0;
                                  }
                                }
                                return _buildMetricCard(
                                  context,
                                  'Total Paid',
                                  CurrencyFormatter.format(totalPaid),
                                  Icons.payments_rounded,
                                  Colors.green.shade600,
                                );
                              },
                              loading: () => _buildMetricCard(
                                context,
                                'Total Paid',
                                '...',
                                Icons.payments_rounded,
                                Colors.green.shade600,
                              ),
                              error: (_, __) => _buildMetricCard(
                                context,
                                'Total Paid',
                                'N/A',
                                Icons.payments_rounded,
                                Colors.green.shade600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      // Metrics Section - Row 2
                      Row(
                        children: [
                          Expanded(
                            child: _buildMetricCard(
                              context,
                              'Balance',
                              CurrencyFormatter.format(
                                  (member['unpaid_balance'] ?? 0).toDouble()),
                              Icons.account_balance_wallet_rounded,
                              Colors.orange.shade600,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: paymentsAsync.when(
                              data: (payments) => _buildMetricCard(
                                context,
                                'Last Payment',
                                payments.isNotEmpty
                                    ? DateFormat('MMM dd').format(
                                        DateTime.parse(
                                          payments[0]['payment_date'] ??
                                              DateTime.now().toIso8601String(),
                                        ),
                                      )
                                    : 'N/A',
                                Icons.calendar_today_rounded,
                                Colors.purple.shade600,
                              ),
                              loading: () => _buildMetricCard(
                                context,
                                'Last Payment',
                                '...',
                                Icons.calendar_today_rounded,
                                Colors.purple.shade600,
                              ),
                              error: (_, __) => _buildMetricCard(
                                context,
                                'Last Payment',
                                'N/A',
                                Icons.calendar_today_rounded,
                                Colors.purple.shade600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),

                      // Payment Options Section
                      tabsAsync.when(
                        data: (tabs) {
                          if (tabs.isEmpty) {
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildSectionHeader(context, 'Make a Payment',
                                    Icons.add_card_rounded),
                                const SizedBox(height: 12),
                                Card(
                                  child: Padding(
                                    padding: const EdgeInsets.all(24),
                                    child: Column(
                                      children: [
                                        Icon(Icons.info_outline,
                                            color: Colors.blue.shade900,
                                            size: 32),
                                        const SizedBox(height: 12),
                                        const Text(
                                            'No payment options available for your membership at this time.'),
                                        TextButton(
                                          onPressed: () => ref
                                              .invalidate(memberTabsProvider),
                                          child: const Text('Check Again'),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 32),
                              ],
                            );
                          }
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSectionHeader(context, 'Make a Payment',
                                  Icons.add_card_rounded),
                              const SizedBox(height: 16),
                              GridView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                gridDelegate:
                                    const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  crossAxisSpacing: 12,
                                  mainAxisSpacing: 12,
                                  childAspectRatio: 0.85,
                                ),
                                itemCount: tabs.length,
                                itemBuilder: (context, index) {
                                  final tab = tabs[index];
                                  return _buildPaymentOptionCard(
                                      context, tab, member, ref);
                                },
                              ),
                              const SizedBox(height: 32),
                            ],
                          );
                        },
                        loading: () => const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(child: CircularProgressIndicator()),
                        ),
                        error: (err, __) => Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildSectionHeader(context, 'Make a Payment',
                                Icons.add_card_rounded),
                            const SizedBox(height: 12),
                            Text('Failed to load payment options: $err'),
                            TextButton(
                              onPressed: () =>
                                  ref.invalidate(memberTabsProvider),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),

                      // History Section
                      _buildSectionHeader(
                          context, 'Payment History', Icons.history_rounded),
                      const SizedBox(height: 16),
                      paymentsAsync.when(
                        data: (payments) =>
                            PaymentHistoryList(payments: payments),
                        loading: () =>
                            const Center(child: CircularProgressIndicator()),
                        error: (error, __) => Center(
                          child: Column(
                            children: [
                              Text('Error loading history: $error'),
                              TextButton(
                                onPressed: () =>
                                    ref.invalidate(memberPaymentsProvider),
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Notifications Section
                      notificationsAsync.when(
                        data: (notifications) {
                          final unreadCount = notifications
                              .where((n) => !(n['is_read'] ?? false))
                              .length;
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  _buildSectionHeader(context, 'Notifications',
                                      Icons.notifications_none_rounded),
                                  if (unreadCount > 0)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.red.shade100,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        '$unreadCount new',
                                        style: TextStyle(
                                            color: Colors.red.shade700,
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              NotificationsList(notifications: notifications),
                            ],
                          );
                        },
                        loading: () => const SizedBox.shrink(),
                        error: (_, __) => const SizedBox.shrink(),
                      ),
                      const SizedBox(height: 48),
                    ]),
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
              const Text('Something went wrong',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(error.toString(), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => ref.invalidate(memberProvider),
                child: const Text('Try Again'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickAction(
      BuildContext context, String label, IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 100,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.blue.shade50),
          boxShadow: [
            BoxShadow(
                color: Colors.blue.shade900.withOpacity(0.02),
                blurRadius: 10,
                offset: const Offset(0, 4)),
          ],
        ),
        child: Column(
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary, size: 24),
            const SizedBox(height: 8),
            Text(label,
                style:
                    const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard(BuildContext context, String title, String value,
      IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.blue.shade50),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.shade900.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: TextStyle(
                color: Colors.blueGrey.shade400,
                fontSize: 12,
                fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
                fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.5),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(
      BuildContext context, String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.blue.shade900),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: Colors.blue.shade900,
            letterSpacing: -0.5,
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentOptionCard(
      BuildContext context, dynamic tab, dynamic member, WidgetRef ref) {
    final tabType = tab['tab_type'] ?? 'payment';
    final tabName = tab['tab_name'] ?? 'Unnamed Tab';
    final isPayment = tabType == 'payment';
    final color =
        isPayment ? Theme.of(context).colorScheme.primary : Colors.teal;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.15)),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
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
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      tabType.toString().toUpperCase(),
                      style: TextStyle(
                          color: color,
                          fontSize: 9,
                          fontWeight: FontWeight.w800),
                    ),
                  ),
                  Icon(Icons.arrow_forward_ios_rounded,
                      size: 12, color: color.withOpacity(0.5)),
                ],
              ),
              const Spacer(),
              Text(
                tabName,
                style: const TextStyle(
                    fontWeight: FontWeight.w900, fontSize: 14, height: 1.2),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  isPayment ? 'Pay Now' : 'Donate',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
