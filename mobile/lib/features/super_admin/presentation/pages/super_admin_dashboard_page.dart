import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/super_admin_provider.dart';
import '../../../../core/presentation/widgets/main_drawer.dart';

class SuperAdminDashboardPage extends ConsumerStatefulWidget {
  const SuperAdminDashboardPage({super.key});

  @override
  ConsumerState<SuperAdminDashboardPage> createState() =>
      _SuperAdminDashboardPageState();
}

class _SuperAdminDashboardPageState
    extends ConsumerState<SuperAdminDashboardPage> {
  String? _loadingOrgId;
  String? _deleteConfirmOrgId;

  Future<void> _handleStatusChange(String orgId, String newStatus) async {
    setState(() => _loadingOrgId = orgId);
    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      await dataSource.updateOrganization(orgId, {'status': newStatus});
      ref.invalidate(superAdminDashboardProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Organization status updated to $newStatus'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error updating organization: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _loadingOrgId = null);
      }
    }
  }

  Future<void> _handleDelete(String orgId) async {
    setState(() => _loadingOrgId = orgId);
    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      await dataSource.deleteOrganization(orgId);
      ref.invalidate(superAdminDashboardProvider);
      if (mounted) {
        setState(() => _deleteConfirmOrgId = null);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Organization deleted successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error deleting organization: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _loadingOrgId = null);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dashboardAsync = ref.watch(superAdminDashboardProvider);

    return Scaffold(
      drawer: const MainDrawer(
          role: 'super_admin', organizationName: 'Global Overview'),
      body: dashboardAsync.when(
        data: (dashboard) {
          if (dashboard == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final organizations =
              dashboard['organizations'] as List<Map<String, dynamic>>;
          final stats = dashboard['stats'] as Map<String, dynamic>;

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(superAdminDashboardProvider);
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
                          Colors.blue.shade800,
                          Colors.blue.shade900,
                        ],
                      ),
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(32),
                        bottomRight: Radius.circular(32),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.blue.shade900.withOpacity(0.3),
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
                            const Text(
                              'Super Admin',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 24,
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
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Icon(Icons.shield_rounded,
                                  color: Colors.white, size: 32),
                            ),
                            const SizedBox(width: 16),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Global Overview',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 22,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                  Text(
                                    'KnsPaymentRail Network Management',
                                    style: TextStyle(
                                      color: Colors.white70,
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
                  padding: const EdgeInsets.all(24),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      // Stats Grid
                      GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 2,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                        childAspectRatio: 1.1,
                        children: [
                          _buildStatCard(
                            context,
                            'Organizations',
                            '${stats['totalOrganizations'] ?? 0}',
                            Icons.business_rounded,
                            Colors.blue.shade600,
                          ),
                          _buildStatCard(
                            context,
                            'Pending Approvals',
                            '${stats['pendingApprovals'] ?? 0}',
                            Icons.pending_actions_rounded,
                            Colors.orange.shade600,
                          ),
                          _buildStatCard(
                            context,
                            'Total Users',
                            '${stats['totalUsers'] ?? 0}',
                            Icons.groups_rounded,
                            Colors.green.shade600,
                          ),
                          _buildStatCard(
                            context,
                            'Total Volume',
                            CurrencyFormatter.format(
                                (stats['totalPayments'] ?? 0).toDouble()),
                            Icons.analytics_rounded,
                            Colors.purple.shade600,
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),

                      // Organizations section
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Network Entities',
                            style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                                color: Colors.blue.shade900,
                                letterSpacing: -0.5),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                                color: Colors.blue.shade50,
                                borderRadius: BorderRadius.circular(20)),
                            child: Text('${organizations.length} Active',
                                style: TextStyle(
                                    color: Colors.blue.shade900,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      if (organizations.isEmpty)
                        _buildEmptyState(context,
                            'No organizations registered in the network.')
                      else
                        ...organizations
                            .map((org) => _buildOrganizationCard(context, org)),

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
                const Text('Network Sync Error',
                    style:
                        TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(error.toString(), textAlign: TextAlign.center),
                const SizedBox(height: 24),
                ElevatedButton(
                    onPressed: () =>
                        ref.invalidate(superAdminDashboardProvider),
                    child: const Text('Retry Connection')),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(48),
      decoration: BoxDecoration(
        color: Colors.blueGrey.shade50.withOpacity(0.3),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
            color: Colors.blueGrey.shade100, style: BorderStyle.solid),
      ),
      child: Column(
        children: [
          Icon(Icons.business_rounded,
              color: Colors.blueGrey.shade200, size: 64),
          const SizedBox(height: 16),
          Text(message,
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: Colors.blueGrey.shade400,
                  fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildStatCard(BuildContext context, String title, String value,
      IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrganizationCard(
      BuildContext context, Map<String, dynamic> org) {
    final status = org['status'] as String? ?? 'pending';
    final isLoading = _loadingOrgId == org['id'];
    final isDeleteConfirm = _deleteConfirmOrgId == org['id'];

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        org['name'] ?? 'N/A',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        org['organization_type'] ?? 'N/A',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey[600],
                            ),
                      ),
                      Text(
                        org['admin_email'] ?? 'N/A',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey[600],
                            ),
                      ),
                      Text(
                        'Created: ${DateFormat('MMM dd, yyyy').format(DateTime.parse(org['created_at'] ?? DateTime.now().toIso8601String()))}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey[500],
                            ),
                      ),
                    ],
                  ),
                ),
                Chip(
                  label: Text(
                    status.toUpperCase(),
                    style: const TextStyle(fontSize: 11),
                  ),
                  backgroundColor: status == 'approved'
                      ? Colors.green.shade100
                      : status == 'pending'
                          ? Colors.orange.shade100
                          : Colors.red.shade100,
                  labelStyle: TextStyle(
                    color: status == 'approved'
                        ? Colors.green.shade800
                        : status == 'pending'
                            ? Colors.orange.shade800
                            : Colors.red.shade800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (status == 'pending')
                  TextButton.icon(
                    onPressed: isLoading
                        ? null
                        : () => _handleStatusChange(org['id'], 'approved'),
                    icon: isLoading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.check_circle, size: 18),
                    label: const Text('Approve'),
                    style: TextButton.styleFrom(foregroundColor: Colors.green),
                  ),
                if (status == 'approved')
                  TextButton.icon(
                    onPressed: isLoading
                        ? null
                        : () => _handleStatusChange(org['id'], 'suspended'),
                    icon: isLoading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.cancel, size: 18),
                    label: const Text('Suspend'),
                    style: TextButton.styleFrom(foregroundColor: Colors.red),
                  ),
                if (status == 'suspended')
                  TextButton.icon(
                    onPressed: isLoading
                        ? null
                        : () => _handleStatusChange(org['id'], 'approved'),
                    icon: isLoading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.check_circle, size: 18),
                    label: const Text('Reactivate'),
                    style: TextButton.styleFrom(foregroundColor: Colors.green),
                  ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, size: 20),
                  color: Colors.red,
                  onPressed: isLoading
                      ? null
                      : () {
                          if (isDeleteConfirm) {
                            _handleDelete(org['id']);
                          } else {
                            setState(() => _deleteConfirmOrgId = org['id']);
                          }
                        },
                ),
              ],
            ),
            if (isDeleteConfirm)
              Container(
                margin: const EdgeInsets.only(top: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Delete Organization?',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.red.shade900,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'This action cannot be undone and will permanently remove all associated data.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.red.shade800,
                          ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: () =>
                              setState(() => _deleteConfirmOrgId = null),
                          child: const Text('Cancel'),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed:
                              isLoading ? null : () => _handleDelete(org['id']),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                          ),
                          child: isLoading
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text('Delete'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
