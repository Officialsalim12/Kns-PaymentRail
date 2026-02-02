import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/admin_provider.dart';
import '../widgets/admin_stats_card.dart';
import '../../../../core/presentation/widgets/main_drawer.dart';

class AdminDashboardPage extends ConsumerWidget {
  const AdminDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(adminDashboardProvider);

    return Scaffold(
      drawer: dashboardAsync.when(
        data: (dashboard) => MainDrawer(
          role: 'org_admin',
          organizationName: dashboard?['organization']?['name'],
        ),
        loading: () => null,
        error: (_, __) => const MainDrawer(role: 'org_admin'),
      ),
      body: dashboardAsync.when(
        data: (dashboard) {
          if (dashboard == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final org = dashboard['organization'];

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(adminDashboardProvider);
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
                          const Color(0xFF1E40AF),
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
                            Text(
                              'Admin Suite',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -0.5,
                                  ),
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
                        const SizedBox(height: 32),
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
                                  child: org?['logo_url'] != null
                                      ? Image.network(org['logo_url'],
                                          fit: BoxFit.contain)
                                      : Center(
                                          child: Text(
                                            (org?['name'] as String?)
                                                    ?.substring(0, 1)
                                                    .toUpperCase() ??
                                                'O',
                                            style: TextStyle(
                                                fontSize: 24,
                                                fontWeight: FontWeight.bold,
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .primary),
                                          ),
                                        ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    org?['name'] ?? 'Organization',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 24,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                  Text(
                                    'Administrative Dashboard',
                                    style: TextStyle(
                                      color: Colors.white.withOpacity(0.7),
                                      fontWeight: FontWeight.w500,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
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
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      // Quick Actions Row
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _buildQuickAction(
                                context,
                                'Members',
                                Icons.people_rounded,
                                () => context.push('/admin/members')),
                            const SizedBox(width: 12),
                            _buildQuickAction(
                                context,
                                'Payments',
                                Icons.payments_rounded,
                                () => context.push('/admin/payments')),
                            const SizedBox(width: 12),
                            _buildQuickAction(
                                context,
                                'Support',
                                Icons.headset_mic_rounded,
                                () => context.push('/admin/messages')),
                            const SizedBox(width: 12),
                            _buildQuickAction(
                                context,
                                'Users',
                                Icons.admin_panel_settings_rounded,
                                () => context.push('/admin/users')),
                            const SizedBox(width: 12),
                            _buildQuickAction(
                                context,
                                'Logs',
                                Icons.history_rounded,
                                () => context.push('/admin/activity-logs')),
                            const SizedBox(width: 12),
                            _buildQuickAction(
                                context,
                                'Reports',
                                Icons.analytics_rounded,
                                () => context.push('/admin/reports')),
                            const SizedBox(width: 12),
                            _buildQuickAction(
                                context,
                                'Payment Tabs',
                                Icons.tab_rounded,
                                () => context.push('/admin/payment-tabs')),
                            const SizedBox(width: 12),
                            _buildQuickAction(
                                context,
                                'Settings',
                                Icons.settings_rounded,
                                () => context.push('/admin/settings')),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Metrics Grid
                      GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 2,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                        childAspectRatio: 0.9,
                        children: [
                          _buildAdminMetric(
                            context,
                            'Total Revenue',
                            CurrencyFormatter.format(
                                (dashboard['stats']['totalPayments'] ?? 0)
                                    .toDouble()),
                            Icons.account_balance_rounded,
                            Colors.blue.shade600,
                          ),
                          _buildAdminMetric(
                            context,
                            'Monthly Rev.',
                            CurrencyFormatter.format(
                                (dashboard['stats']['monthlyRevenue'] ?? 0)
                                    .toDouble()),
                            Icons.analytics_rounded,
                            Colors.green.shade600,
                          ),
                          _buildAdminMetric(
                            context,
                            'Total Members',
                            '${dashboard['stats']['totalMembers'] ?? 0}',
                            Icons.groups_rounded,
                            Colors.purple.shade600,
                          ),
                          _buildAdminMetric(
                            context,
                            'Pending',
                            '${dashboard['pendingMembers']?.length ?? 0}',
                            Icons.pending_actions_rounded,
                            Colors.orange.shade600,
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),

                      // Recent activity section
                      _buildSectionHeader(
                          context, 'Recent Activity', Icons.history_rounded),
                      const SizedBox(height: 16),
                      if (dashboard['recentPayments'] == null ||
                          (dashboard['recentPayments'] as List).isEmpty)
                        _buildEmptyState(context, 'No recent payments found.')
                      else
                        ...(dashboard['recentPayments'] as List)
                            .map((p) => _buildPaymentListItem(context, p)),

                      const SizedBox(height: 32),

                      // Pending Approvals section
                      _buildSectionHeader(context, 'Registration Requests',
                          Icons.person_add_rounded),
                      const SizedBox(height: 16),
                      if (dashboard['pendingMembers'] == null ||
                          (dashboard['pendingMembers'] as List).isEmpty)
                        _buildEmptyState(context, 'No pending approvals.')
                      else
                        ...(dashboard['pendingMembers'] as List)
                            .map((m) => _buildMemberListItem(context, m)),

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
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                const SizedBox(height: 16),
                const Text('Error Loading Dashboard',
                    style:
                        TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(error.toString(), textAlign: TextAlign.center),
                const SizedBox(height: 24),
                ElevatedButton(
                    onPressed: () => ref.invalidate(adminDashboardProvider),
                    child: const Text('Retry')),
              ],
            ),
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

  Widget _buildAdminMetric(BuildContext context, String title, String value,
      IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: color.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
              color: color.withOpacity(0.04),
              blurRadius: 12,
              offset: const Offset(0, 6)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color, size: 22),
          ),
          const Spacer(),
          Text(title,
              style: TextStyle(
                  color: Colors.blueGrey.shade400,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.2)),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.5)),
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
        Text(title,
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: Colors.blue.shade900,
                letterSpacing: -0.5)),
      ],
    );
  }

  Widget _buildEmptyState(BuildContext context, String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.blueGrey.shade50.withOpacity(0.3),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
            color: Colors.blueGrey.shade50, style: BorderStyle.solid),
      ),
      child: Center(
          child: Text(message,
              style: TextStyle(
                  color: Colors.blueGrey.shade400,
                  fontWeight: FontWeight.w500))),
    );
  }

  Widget _buildPaymentListItem(BuildContext context, dynamic payment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blue.shade50),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
              color: Colors.green.shade50, shape: BoxShape.circle),
          child: Icon(Icons.north_east_rounded,
              color: Colors.green.shade600, size: 20),
        ),
        title: Text(payment['member']?['full_name'] ?? 'Member',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(
            DateFormat('MMM dd, yyyy').format(DateTime.parse(
                payment['payment_date'] ?? DateTime.now().toIso8601String())),
            style: TextStyle(fontSize: 12, color: Colors.blueGrey.shade400)),
        trailing: Text(
            CurrencyFormatter.format((payment['amount'] ?? 0).toDouble()),
            style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 16,
                color: Colors.black)),
      ),
    );
  }

  Widget _buildMemberListItem(BuildContext context, dynamic member) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.orange.shade50),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: CircleAvatar(
          backgroundColor: Colors.orange.shade100,
          child: Text(
              (member['full_name'] as String?)?.substring(0, 1).toUpperCase() ??
                  'M',
              style: TextStyle(
                  color: Colors.orange.shade800, fontWeight: FontWeight.bold)),
        ),
        title: Text(member['full_name'] ?? 'N/A',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(member['membership_id'] ?? 'N/A',
            style: TextStyle(fontSize: 12, color: Colors.blueGrey.shade400)),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
              color: Colors.orange.shade100,
              borderRadius: BorderRadius.circular(8)),
          child: Text('PENDING',
              style: TextStyle(
                  color: Colors.orange.shade800,
                  fontSize: 10,
                  fontWeight: FontWeight.bold)),
        ),
      ),
    );
  }
}

Widget _buildLogoPlaceholder(BuildContext context, String? orgName) {
  return Container(
    width: 64,
    height: 64,
    decoration: BoxDecoration(
      color: Colors.grey[200],
      borderRadius: BorderRadius.circular(8),
    ),
    child: Center(
      child: Text(
        orgName?.isNotEmpty == true ? orgName![0].toUpperCase() : 'O',
        style: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: Colors.grey[600],
        ),
      ),
    ),
  );
}
