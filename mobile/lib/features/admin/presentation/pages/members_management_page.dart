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
  ConsumerState<MembersManagementPage> createState() => _MembersManagementPageState();
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

  Future<void> _updateMemberStatus(String memberId, String newStatus, {double? unpaidBalance}) async {
    setState(() => _loadingMemberId = memberId);
    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      await dataSource.updateMemberStatus(memberId, newStatus, unpaidBalance: unpaidBalance);
      
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
        content: const Text('This will recalculate the member\'s balance based on existing payments. Continue?'),
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
      final authAsync = ref.read(authProvider);
      final user = authAsync.value;
      if (user == null) throw Exception('User not found');

      final userProfile = await dataSource.getUserProfile(user.id);
      if (userProfile == null || userProfile['organization_id'] == null) {
        throw Exception('Organization not found');
      }

      // Get all payments for this member
      final payments = await dataSource.getPayments(
        userProfile['organization_id'],
        memberId: memberId,
      );

      // Calculate total balance added from all payments
      double totalBalanceAdded = 0;
      for (var payment in payments) {
        final description = payment['description'] as String?;
        if (description != null) {
          final regex = RegExp(r'\[BALANCE_ADDED:\s*([\d]+\.?[\d]*)\]', caseSensitive: false);
          final match = regex.firstMatch(description);
          if (match != null && match.group(1) != null) {
            final balanceAmount = double.tryParse(match.group(1)!);
            if (balanceAmount != null) {
              totalBalanceAdded += balanceAmount;
            }
          }
        }
      }

      // Update member balance
      await dataSource.updateMember(memberId, {'unpaid_balance': totalBalanceAdded});

      if (mounted) {
        ref.invalidate(adminMembersProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Balance recalculated successfully. New balance: ${CurrencyFormatter.format(totalBalanceAdded)}'),
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
        content: const Text('This will reset the member\'s balance to 0. Continue?'),
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
      await dataSource.updateMember(memberId, {'unpaid_balance': 0});

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

  void _showApproveDialog(String memberId, String memberName, double? currentBalance) {
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
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
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
              await _updateMemberStatus(memberId, 'active', unpaidBalance: balance);
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

  List<Map<String, dynamic>> _filterMembers(List<Map<String, dynamic>> members) {
    if (_searchQuery.trim().isEmpty) return members;
    
    final query = _searchQuery.toLowerCase().trim();
    return members.where((member) {
      final name = (member['full_name'] ?? '').toString().toLowerCase();
      final membershipId = (member['membership_id'] ?? '').toString().toLowerCase();
      return name.contains(query) || membershipId.contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final membersAsync = ref.watch(adminMembersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Members Management'),
      ),
      body: membersAsync.when(
        data: (members) {
          final filteredMembers = _filterMembers(members);
          
          if (members.isEmpty) {
            return Center(
              child: Text(
                'No members yet',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.grey[600],
                    ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(adminMembersProvider);
            },
            child: Column(
              children: [
                // Search bar
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search by name or membership ID...',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () {
                                _searchController.clear();
                                setState(() {
                                  _searchQuery = '';
                                });
                              },
                            )
                          : null,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    onChanged: (value) {
                      setState(() {
                        _searchQuery = value;
                      });
                    },
                  ),
                ),
                // Member count
                if (_searchQuery.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Showing ${filteredMembers.length} of ${members.length} members',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey[600],
                            ),
                      ),
                    ),
                  )
                else
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '${members.length} total members',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey[600],
                            ),
                      ),
                    ),
                  ),
                // Members list
                Expanded(
                  child: filteredMembers.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.search_off, size: 64, color: Colors.grey[300]),
                              const SizedBox(height: 16),
                              Text(
                                'No members found matching "${_searchQuery}"',
                                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                      color: Colors.grey[600],
                                    ),
                              ),
                              const SizedBox(height: 8),
                              TextButton(
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() {
                                    _searchQuery = '';
                                  });
                                },
                                child: const Text('Clear search'),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredMembers.length,
                          itemBuilder: (context, index) {
                final member = filteredMembers[index];
                final status = member['status'] as String? ?? 'pending';
                final isLoading = _loadingMemberId == member['id'];

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ExpansionTile(
                    title: Text(
                      member['full_name'] ?? 'N/A',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('ID: ${member['membership_id'] ?? 'N/A'}'),
                        Text('Email: ${member['email'] ?? 'N/A'}'),
                        if (member['phone_number'] != null)
                          Text('Phone: ${member['phone_number']}'),
                      ],
                    ),
                    trailing: Chip(
                      label: Text(status.toUpperCase()),
                      backgroundColor: _getStatusColor(status).withOpacity(0.2),
                      labelStyle: TextStyle(
                        color: _getStatusColor(status),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Unpaid Balance:'),
                                Text(
                                  CurrencyFormatter.format(
                                      (member['unpaid_balance'] ?? 0).toDouble()),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            if (status == 'pending') ...[
                              Row(
                                children: [
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: isLoading
                                          ? null
                                          : () => _showApproveDialog(
                                                member['id'],
                                                member['full_name'] ?? 'Member',
                                                (member['unpaid_balance'] ?? 0).toDouble(),
                                              ),
                                      icon: const Icon(Icons.check, size: 18),
                                      label: const Text('Approve'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.green,
                                        foregroundColor: Colors.white,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: isLoading
                                          ? null
                                          : () => _updateMemberStatus(
                                                member['id'],
                                                'inactive',
                                              ),
                                      icon: const Icon(Icons.close, size: 18),
                                      label: const Text('Reject'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.red,
                                        foregroundColor: Colors.white,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ] else if (status == 'active') ...[
                              ElevatedButton.icon(
                                onPressed: isLoading
                                    ? null
                                    : () => _updateMemberStatus(
                                          member['id'],
                                          'suspended',
                                        ),
                                icon: const Icon(Icons.pause, size: 18),
                                label: const Text('Suspend'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.orange,
                                  foregroundColor: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 8),
                              ElevatedButton.icon(
                                onPressed: isLoading
                                    ? null
                                    : () async {
                                        final authAsync = ref.read(authProvider);
                                        final user = authAsync.value;
                                        if (user == null) return;
                                        final dataSource = ref.read(supabaseDataSourceProvider);
                                        final userProfile = await dataSource.getUserProfile(user.id);
                                        if (userProfile == null || userProfile['organization_id'] == null) return;
                                        
                                        if (context.mounted) {
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
                                      },
                                icon: const Icon(Icons.tab, size: 18),
                                label: const Text('Manage Tabs'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.purple,
                                  foregroundColor: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: isLoading
                                          ? null
                                          : () => _recalculateBalance(member['id']),
                                      icon: const Icon(Icons.calculate, size: 18),
                                      label: const Text('Recalc'),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: isLoading
                                          ? null
                                          : () => _resetBalance(member['id']),
                                      icon: const Icon(Icons.refresh, size: 18),
                                      label: const Text('Reset'),
                                    ),
                                  ),
                                ],
                              ),
                            ] else if (status == 'suspended') ...[
                              ElevatedButton.icon(
                                onPressed: isLoading
                                    ? null
                                    : () => _updateMemberStatus(
                                          member['id'],
                                          'active',
                                        ),
                                icon: const Icon(Icons.play_arrow, size: 18),
                                label: const Text('Reactivate'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.green,
                                  foregroundColor: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 8),
                              ElevatedButton.icon(
                                onPressed: isLoading
                                    ? null
                                    : () async {
                                        final authAsync = ref.read(authProvider);
                                        final user = authAsync.value;
                                        if (user == null) return;
                                        final dataSource = ref.read(supabaseDataSourceProvider);
                                        final userProfile = await dataSource.getUserProfile(user.id);
                                        if (userProfile == null || userProfile['organization_id'] == null) return;
                                        
                                        if (context.mounted) {
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
                                      },
                                icon: const Icon(Icons.tab, size: 18),
                                label: const Text('Manage Tabs'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.purple,
                                  foregroundColor: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: isLoading
                                          ? null
                                          : () => _recalculateBalance(member['id']),
                                      icon: const Icon(Icons.calculate, size: 18),
                                      label: const Text('Recalc'),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: isLoading
                                          ? null
                                          : () => _resetBalance(member['id']),
                                      icon: const Icon(Icons.refresh, size: 18),
                                      label: const Text('Reset'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                            if (isLoading)
                              const Padding(
                                padding: EdgeInsets.only(top: 8),
                                child: Center(child: CircularProgressIndicator()),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
                          },
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
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
              const SizedBox(height: 16),
              Text('Error loading members'),
              const SizedBox(height: 8),
              Text(error.toString()),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => ref.invalidate(adminMembersProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

