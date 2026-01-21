import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/admin_provider.dart';
import '../widgets/admin_stats_card.dart';

class AdminDashboardPage extends ConsumerWidget {
  const AdminDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(adminDashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('KNS MultiRail'),
        actions: [
          IconButton(
            icon: const Icon(Icons.people),
            tooltip: 'Members',
            onPressed: () {
              context.push('/admin/members');
            },
          ),
          IconButton(
            icon: const Icon(Icons.payment),
            tooltip: 'Payments',
            onPressed: () {
              context.push('/admin/payments');
            },
          ),
          IconButton(
            icon: const Icon(Icons.message_outlined),
            tooltip: 'Messages',
            onPressed: () {
              context.push('/admin/messages');
            },
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'Settings',
            onPressed: () {
              context.push('/admin/settings');
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout_outlined),
            tooltip: 'Sign Out',
            onPressed: () async {
              await ref.read(authProvider.notifier).signOut();
              if (context.mounted) {
                context.go('/login');
              }
            },
          ),
        ],
      ),
      body: dashboardAsync.when(
        data: (dashboard) {
          if (dashboard == null) {
            return const Center(child: CircularProgressIndicator());
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(adminDashboardProvider);
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
                  if (dashboard['organization'] != null)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Row(
                          children: [
                            if (dashboard['organization']['logo_url'] != null)
                              Image.network(
                                dashboard['organization']['logo_url'],
                                width: 64,
                                height: 64,
                                errorBuilder: (context, error, stackTrace) =>
                                    _buildLogoPlaceholder(
                                        context, dashboard['organization']['name']),
                              )
                            else
                              _buildLogoPlaceholder(
                                  context, dashboard['organization']['name']),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    dashboard['organization']['name'] ?? 'Organization',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleLarge
                                        ?.copyWith(fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    'Organization Dashboard',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(color: Colors.grey[600]),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  SizedBox(height: padding),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final isSmallScreen = constraints.maxWidth < 400;
                      return Row(
                        children: [
                          Expanded(
                            child: AdminStatsCard(
                              title: 'Total Members',
                              value: '${dashboard['stats']['totalMembers'] ?? 0}',
                              subtitle: '${dashboard['stats']['activeMembers'] ?? 0} active',
                              icon: Icons.people,
                              color: Colors.blue,
                            ),
                          ),
                          SizedBox(width: isSmallScreen ? 8 : 12),
                          Expanded(
                        child: AdminStatsCard(
                          title: 'Total Payments',
                          value: CurrencyFormatter.format(
                              (dashboard['stats']['totalPayments'] ?? 0).toDouble()),
                          icon: Icons.payments,
                          color: Colors.green,
                        ),
                      ),
                    ],
                  );
                    },
                  ),
                  SizedBox(height: padding / 1.3),
                  AdminStatsCard(
                    title: 'Pending Approvals',
                    value: '${dashboard['pendingMembers']?.length ?? 0}',
                    icon: Icons.pending_actions,
                    color: Colors.orange,
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Payment Record',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      TextButton(
                        onPressed: () {
                          context.push('/admin/payments');
                        },
                        child: const Text('View All'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (dashboard['recentPayments'] == null ||
                      (dashboard['recentPayments'] as List).isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Center(
                          child: Text(
                            'No payments yet',
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(color: Colors.grey[600]),
                          ),
                        ),
                      ),
                    )
                  else
                    ...(dashboard['recentPayments'] as List).map((payment) {
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(
                            CurrencyFormatter.format(
                                (payment['amount'] ?? 0).toDouble()),
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(payment['reference_number'] ?? ''),
                              if (payment['member'] != null)
                                Text(
                                  '${payment['member']['full_name']} (${payment['member']['membership_id']})',
                                  style: const TextStyle(fontSize: 12),
                                ),
                              Text(
                                DateFormat('MMM dd, yyyy').format(
                                    DateTime.parse(payment['payment_date'] ?? DateTime.now().toIso8601String())),
                                style: TextStyle(
                                    fontSize: 11, color: Colors.grey[600]),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),

                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Pending Approvals',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      TextButton(
                        onPressed: () {
                          context.push('/admin/members');
                        },
                        child: const Text('Manage'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (dashboard['pendingMembers'] == null ||
                      (dashboard['pendingMembers'] as List).isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Center(
                          child: Text(
                            'No pending approvals',
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(color: Colors.grey[600]),
                          ),
                        ),
                      ),
                    )
                  else
                    ...(dashboard['pendingMembers'] as List).map((member) {
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(
                            member['full_name'] ?? 'N/A',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(member['membership_id'] ?? 'N/A'),
                              Text(
                                member['email'] ?? 'N/A',
                                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                              ),
                            ],
                          ),
                          trailing: Chip(
                            label: const Text(
                              'Pending',
                              style: TextStyle(fontSize: 11),
                            ),
                            backgroundColor: Colors.orange.shade100,
                            labelStyle: TextStyle(color: Colors.orange.shade800),
                          ),
                        ),
                      );
                    }).toList(),
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
                Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                const SizedBox(height: 16),
                Text(
                  'Error Loading Dashboard',
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
                    ref.invalidate(adminDashboardProvider);
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
          orgName?.isNotEmpty == true
              ? orgName![0].toUpperCase()
              : 'O',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.grey[600],
          ),
        ),
      ),
    );
  }
}
