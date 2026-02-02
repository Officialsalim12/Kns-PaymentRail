import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/admin_provider.dart';
import '../widgets/member_tabs_manager.dart';

class MembersManagementPage extends ConsumerStatefulWidget {
  const MembersManagementPage({super.key});

  @override
  ConsumerState<MembersManagementPage> createState() =>
      _MembersManagementPageState();
}

class _MembersManagementPageState extends ConsumerState<MembersManagementPage> {
  String? _loadingMemberId;
  String? _approveMemberId;
  String? _approveMemberName;
  final TextEditingController _balanceController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _balanceController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _updateMemberStatus(String memberId, String newStatus,
      {double? unpaidBalance}) async {
    setState(() => _loadingMemberId = memberId);
    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      await dataSource.updateMemberStatus(memberId, newStatus,
          unpaidBalance: unpaidBalance);

      if (mounted) {
        ref.invalidate(adminMembersProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Member status updated successfully')),
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
        setState(() => _loadingMemberId = null);
      }
    }
  }

  Future<void> _recalculateBalance(String memberId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Recalculate Balance'),
        content: const Text(
            'This will recalculate the member\'s balance based on existing payments. Continue?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Continue'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _loadingMemberId = memberId);
    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      await dataSource.recalculateBalance(memberId);

      if (mounted) {
        ref.invalidate(adminMembersProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'Balance recalculated successfully based on transaction history.'),
          ),
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
        setState(() => _loadingMemberId = null);
      }
    }
  }

  Future<void> _resetBalance(String memberId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset Balance'),
        content:
            const Text('This will reset the member\'s balance to 0. Continue?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Continue'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _loadingMemberId = memberId);
    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      await dataSource.resetMemberBalance(memberId);

      if (mounted) {
        ref.invalidate(adminMembersProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Balance reset to 0 successfully')),
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
        setState(() => _loadingMemberId = null);
      }
    }
  }

  void _showApproveDialog(
      String memberId, String memberName, double? currentBalance) {
    _balanceController.text = (currentBalance ?? 0).toString();
    setState(() {
      _approveMemberId = memberId;
      _approveMemberName = memberName;
    });

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Approve Member: $memberName'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Set initial unpaid balance:'),
            const SizedBox(height: 8),
            TextField(
              controller: _balanceController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Initial Unpaid Balance',
                hintText: '0.00',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Enter 0 if no initial balance',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _approveMemberId = null;
                _approveMemberName = null;
              });
            },
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final balance = double.tryParse(_balanceController.text) ?? 0;
              Navigator.pop(context);
              await _updateMemberStatus(memberId, 'active',
                  unpaidBalance: balance);
              setState(() {
                _approveMemberId = null;
                _approveMemberName = null;
              });
            },
            child: const Text('Approve'),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'active':
        return Colors.green;
      case 'inactive':
        return Colors.grey;
      case 'suspended':
        return Colors.red;
      default:
        return Colors.orange;
    }
  }

  List<Map<String, dynamic>> _filterMembers(
      List<Map<String, dynamic>> members) {
    if (_searchQuery.trim().isEmpty) return members;

    final query = _searchQuery.toLowerCase().trim();
    return members.where((member) {
      final name = (member['full_name'] ?? '').toString().toLowerCase();
      final membershipId =
          (member['membership_id'] ?? '').toString().toLowerCase();
      return name.contains(query) || membershipId.contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final membersAsync = ref.watch(adminMembersProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: membersAsync.when(
        data: (members) {
          final filteredMembers = _filterMembers(members);

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(adminMembersProvider);
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
                          Theme.of(context).primaryColor,
                          const Color(0xFF1E40AF),
                        ],
                      ),
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(32),
                        bottomRight: Radius.circular(32),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color:
                              Theme.of(context).primaryColor.withOpacity(0.3),
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
                                backgroundColor: Colors.white.withOpacity(0.15),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.people_alt_rounded,
                                      color: Colors.white, size: 16),
                                  const SizedBox(width: 8),
                                  Text(
                                    '${members.length} Members',
                                    style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 32),
                        const Text(
                          'Members Registry',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -1,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: TextField(
                            controller: _searchController,
                            onChanged: (v) => setState(() => _searchQuery = v),
                            decoration: InputDecoration(
                              hintText: 'Search by name or ID...',
                              prefixIcon: const Icon(Icons.search_rounded),
                              suffixIcon: _searchQuery.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(Icons.close_rounded),
                                      onPressed: () {
                                        _searchController.clear();
                                        setState(() => _searchQuery = '');
                                      },
                                    )
                                  : null,
                              border: InputBorder.none,
                              contentPadding:
                                  const EdgeInsets.symmetric(vertical: 16),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(24, 32, 24, 48),
                  sliver: filteredMembers.isEmpty
                      ? SliverFillRemaining(
                          hasScrollBody: false,
                          child: _buildEmptyState(),
                        )
                      : SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final member = filteredMembers[index];
                              return _buildMemberListItem(member);
                            },
                            childCount: filteredMembers.length,
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
              const Icon(Icons.wifi_off_rounded, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              const Text('Connection interrupted',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(error.toString(), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => ref.invalidate(adminMembersProvider),
                child: const Text('Try Refreshing'),
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
        Icon(Icons.person_search_rounded,
            size: 80, color: Colors.grey.shade300),
        const SizedBox(height: 20),
        Text(
          _searchQuery.isEmpty
              ? 'No members registered yet'
              : 'No result for "$_searchQuery"',
          style: TextStyle(
              color: Colors.blueGrey.shade400,
              fontSize: 16,
              fontWeight: FontWeight.w600),
        ),
        if (_searchQuery.isNotEmpty)
          TextButton(
            onPressed: () {
              _searchController.clear();
              setState(() => _searchQuery = '');
            },
            child: const Text('Clear Search'),
          ),
      ],
    );
  }

  Widget _buildMemberListItem(Map<String, dynamic> member) {
    final status = member['status'] as String? ?? 'pending';
    final isLoading = _loadingMemberId == member['id'];
    final balance = (member['unpaid_balance'] ?? 0).toDouble();

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.blueGrey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.blueGrey.shade900.withOpacity(0.04),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Theme(
          data: ThemeData().copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            tilePadding:
                const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            leading: CircleAvatar(
              backgroundColor: _getStatusColor(status).withOpacity(0.1),
              child: Text(
                (member['full_name'] as String? ?? '?')[0].toUpperCase(),
                style: TextStyle(
                    color: _getStatusColor(status),
                    fontWeight: FontWeight.bold),
              ),
            ),
            title: Text(
              member['full_name'] ?? 'Unknown Member',
              style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 17,
                  color: Color(0xFF0F172A)),
            ),
            subtitle: Row(
              children: [
                const Icon(Icons.qr_code_rounded,
                    size: 12, color: Colors.blueGrey),
                const SizedBox(width: 4),
                Text(
                  member['membership_id'] ?? 'N/A',
                  style: const TextStyle(
                      color: Colors.blueGrey,
                      fontSize: 12,
                      fontWeight: FontWeight.w500),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStatusColor(status).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: TextStyle(
                      color: _getStatusColor(status),
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.blueGrey.shade50.withOpacity(0.5),
                  border:
                      Border(top: BorderSide(color: Colors.blueGrey.shade100)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Oustanding Balance',
                                style: TextStyle(
                                    color: Colors.blueGrey,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600)),
                            const SizedBox(height: 4),
                            Text(
                              CurrencyFormatter.format(balance),
                              style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF0F172A)),
                            ),
                          ],
                        ),
                        if (isLoading)
                          const CircularProgressIndicator(strokeWidth: 2)
                        else
                          _buildQuickActionButton(
                            icon: Icons.refresh_rounded,
                            onTap: () => _recalculateBalance(member['id']),
                            tooltip: 'Recalculate',
                          ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    const Divider(),
                    const SizedBox(height: 16),
                    Column(
                      children: [
                        if (status == 'pending')
                          Row(
                            children: [
                              Expanded(
                                child: _buildActionButton(
                                  label: 'Approve Member',
                                  icon: Icons.check_circle_rounded,
                                  color: Colors.green,
                                  onPressed: () => _showApproveDialog(
                                    member['id'],
                                    member['full_name'] ?? 'Member',
                                    balance,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildActionButton(
                                  label: 'Reject',
                                  icon: Icons.cancel_rounded,
                                  color: Colors.red,
                                  onPressed: () => _updateMemberStatus(
                                      member['id'], 'inactive'),
                                ),
                              ),
                            ],
                          )
                        else if (status == 'active')
                          Row(
                            children: [
                              Expanded(
                                child: _buildActionButton(
                                  label: 'Tabs',
                                  icon: Icons.tab_rounded,
                                  color: Colors.purple,
                                  onPressed: () => _handleManageTabs(member),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildActionButton(
                                  label: 'Suspend',
                                  icon: Icons.pause_circle_filled_rounded,
                                  color: Colors.orange,
                                  onPressed: () => _updateMemberStatus(
                                      member['id'], 'suspended'),
                                ),
                              ),
                            ],
                          )
                        else if (status == 'suspended')
                          Row(
                            children: [
                              Expanded(
                                child: _buildActionButton(
                                  label: 'Reactivate',
                                  icon: Icons.play_circle_filled_rounded,
                                  color: Colors.green,
                                  onPressed: () => _updateMemberStatus(
                                      member['id'], 'active'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildActionButton(
                                  label: 'Reset',
                                  icon: Icons.lock_reset_rounded,
                                  color: Colors.blueGrey,
                                  onPressed: () => _resetBalance(member['id']),
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionButton(
      {required IconData icon,
      required VoidCallback onTap,
      required String tooltip}) {
    return IconButton(
      onPressed: onTap,
      icon: Icon(icon, color: Colors.blueGrey, size: 20),
      tooltip: tooltip,
      style: IconButton.styleFrom(
        backgroundColor: Colors.white,
        hoverColor: Colors.blueGrey.shade50,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.blueGrey.shade100)),
      ),
    );
  }

  Widget _buildActionButton(
      {required String label,
      required IconData icon,
      required Color color,
      required VoidCallback onPressed}) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 16),
      label: Text(label,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 12),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  Future<void> _handleManageTabs(Map<String, dynamic> member) async {
    final authAsync = ref.read(authProvider);
    final user = authAsync.value;
    if (user == null) return;

    final dataSource = ref.read(supabaseDataSourceProvider);
    final userProfile = await dataSource.getUserProfile(user.id);
    if (userProfile == null || userProfile['organization_id'] == null) return;

    if (mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => MemberTabsManager(
            memberId: member['id'],
            memberName: member['full_name'] ?? 'Member',
            organizationId: userProfile['organization_id'],
          ),
        ),
      );
    }
  }
}
