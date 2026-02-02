import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class MemberTabsManager extends ConsumerStatefulWidget {
  final String memberId;
  final String memberName;
  final String organizationId;

  const MemberTabsManager({
    super.key,
    required this.memberId,
    required this.memberName,
    required this.organizationId,
  });

  @override
  ConsumerState<MemberTabsManager> createState() => _MemberTabsManagerState();
}

class _MemberTabsManagerState extends ConsumerState<MemberTabsManager> {
  List<Map<String, dynamic>> _tabs = [];
  bool _loading = true;
  Map<String, dynamic>? _editingTab;
  final _formKey = GlobalKey<FormState>();
  final _tabNameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _monthlyCostController = TextEditingController();
  String _tabType = 'payment';
  bool _isActive = true;

  @override
  void initState() {
    super.initState();
    _loadTabs();
  }

  @override
  void dispose() {
    _tabNameController.dispose();
    _descriptionController.dispose();
    _monthlyCostController.dispose();
    super.dispose();
  }

  Future<void> _loadTabs() async {
    setState(() => _loading = true);
    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      final tabs = await dataSource.getMemberTabsForAdmin(widget.memberId);
      setState(() {
        _tabs = tabs;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading tabs: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showCreateDialog() {
    setState(() {
      _editingTab = null;
      _tabNameController.clear();
      _descriptionController.clear();
      _monthlyCostController.clear();
      _tabType = 'payment';
      _isActive = true;
    });
    _showModal();
  }

  void _showEditDialog(Map<String, dynamic> tab) {
    setState(() {
      _editingTab = tab;
      _tabNameController.text = tab['tab_name'] ?? '';
      _descriptionController.text = tab['description'] ?? '';
      final tabType = tab['tab_type'] ?? 'payment';
      _tabType = tabType;
      // Only set monthly cost if it's a payment tab
      if (tabType == 'payment') {
        _monthlyCostController.text = tab['monthly_cost']?.toString() ?? '';
      } else {
        _monthlyCostController.clear();
      }
      _isActive = tab['is_active'] ?? true;
    });
    _showModal();
  }

  void _showModal() {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  _editingTab != null ? 'Edit Tab' : 'Create New Tab',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _tabNameController,
                  decoration: const InputDecoration(
                    labelText: 'Tab Name *',
                    border: OutlineInputBorder(),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Tab name is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _tabType,
                  decoration: const InputDecoration(
                    labelText: 'Tab Type *',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'payment',
                      child: Text('Payment (shows "Pay Now")'),
                    ),
                    DropdownMenuItem(
                      value: 'donation',
                      child: Text('Donation (shows "Donate Here")'),
                    ),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _tabType = value;
                        // Clear monthly cost when switching to donation
                        if (value == 'donation') {
                          _monthlyCostController.clear();
                        }
                      });
                    }
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Description (Optional)',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                ),
                if (_tabType == 'payment') ...[
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _monthlyCostController,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Monthly Cost *',
                      border: OutlineInputBorder(),
                      prefixText: 'Le ',
                    ),
                    validator: (value) {
                      if (_tabType == 'payment' &&
                          (value == null || value.trim().isEmpty)) {
                        return 'Monthly cost is required for payment tabs';
                      }
                      if (value != null && value.trim().isNotEmpty) {
                        final cost = double.tryParse(value);
                        if (cost == null || cost <= 0) {
                          return 'Please enter a valid amount';
                        }
                      }
                      return null;
                    },
                  ),
                ],
                const SizedBox(height: 16),
                CheckboxListTile(
                  title: const Text('Active (visible to member)'),
                  value: _isActive,
                  onChanged: (value) {
                    setState(() => _isActive = value ?? true);
                  },
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          Navigator.pop(context);
                        },
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () async {
                          if (_formKey.currentState!.validate()) {
                            Navigator.pop(context);
                            await _saveTab();
                          }
                        },
                        child: Text(_editingTab != null ? 'Update' : 'Create'),
                      ),
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

  Future<void> _saveTab() async {
    if (!_formKey.currentState!.validate()) return;

    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      final authAsync = ref.read(authProvider);
      final user = authAsync.value;
      if (user == null) throw Exception('User not found');

      if (_editingTab != null) {
        // Update existing tab
        final updateData = <String, dynamic>{
          'tab_name': _tabNameController.text.trim(),
          'tab_type': _tabType,
          'description': _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          'is_active': _isActive,
        };

        // Only include monthly_cost if tab_type is payment
        if (_tabType == 'payment') {
          final monthlyCost = _monthlyCostController.text.trim().isEmpty
              ? null
              : double.tryParse(_monthlyCostController.text.trim());
          updateData['monthly_cost'] = monthlyCost;
        } else {
          updateData['monthly_cost'] = null;
        }

        await dataSource.updateMemberTab(_editingTab!['id'], updateData);
      } else {
        // Create new tab
        final insertData = <String, dynamic>{
          'organization_id': widget.organizationId,
          'member_id': widget.memberId,
          'tab_name': _tabNameController.text.trim(),
          'tab_type': _tabType,
          'description': _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          'is_active': _isActive,
          'created_by': user.id,
        };

        // Only include monthly_cost if tab_type is payment
        if (_tabType == 'payment') {
          final monthlyCost = _monthlyCostController.text.trim().isEmpty
              ? null
              : double.tryParse(_monthlyCostController.text.trim());
          insertData['monthly_cost'] = monthlyCost;
        }

        await dataSource.createMemberTab(insertData);
      }

      _loadTabs();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_editingTab != null
                ? 'Tab updated successfully'
                : 'Tab created successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving tab: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _deleteTab(String tabId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Tab'),
        content: const Text('Are you sure you want to delete this tab?'),
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

    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      await dataSource.deleteMemberTab(tabId);
      _loadTabs();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Tab deleted successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error deleting tab: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _toggleActive(Map<String, dynamic> tab) async {
    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      await dataSource.updateMemberTab(tab['id'], {
        'is_active': !(tab['is_active'] ?? true),
      });
      _loadTabs();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error updating tab: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Manage Tabs - ${widget.memberName}'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Tabs (${_tabs.length})',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      ElevatedButton.icon(
                        onPressed: _showCreateDialog,
                        icon: const Icon(Icons.add),
                        label: const Text('Create Tab'),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: _tabs.isEmpty
                      ? Center(
                          child: Text(
                            'No tabs created yet.\nClick "Create Tab" to add one.',
                            textAlign: TextAlign.center,
                            style:
                                Theme.of(context).textTheme.bodyLarge?.copyWith(
                                      color: Colors.grey[600],
                                    ),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _tabs.length,
                          itemBuilder: (context, index) {
                            final tab = _tabs[index];
                            final isActive = tab['is_active'] ?? true;
                            final tabType = tab['tab_type'] ?? 'payment';

                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: ListTile(
                                title: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        tab['tab_name'] ?? 'Unnamed Tab',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: tabType == 'payment'
                                            ? Colors.blue.withOpacity(0.2)
                                            : Colors.purple.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        tabType == 'payment'
                                            ? 'Payment'
                                            : 'Donation',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: tabType == 'payment'
                                              ? Colors.blue[700]
                                              : Colors.purple[700],
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    if (!isActive)
                                      Container(
                                        margin: const EdgeInsets.only(left: 8),
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.grey.withOpacity(0.2),
                                          borderRadius:
                                              BorderRadius.circular(4),
                                        ),
                                        child: const Text(
                                          'Inactive',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (tab['description'] != null)
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(bottom: 4),
                                        child: Text(tab['description']),
                                      ),
                                    if (tabType == 'payment' &&
                                        tab['monthly_cost'] != null)
                                      Text(
                                        'Monthly Cost: ${CurrencyFormatter.format((tab['monthly_cost'] as num).toDouble())}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w500,
                                          color: Colors.grey,
                                        ),
                                      ),
                                  ],
                                ),
                                trailing: PopupMenuButton(
                                  itemBuilder: (context) => [
                                    PopupMenuItem(
                                      onTap: () => _toggleActive(tab),
                                      child: Text(
                                          isActive ? 'Deactivate' : 'Activate'),
                                    ),
                                    PopupMenuItem(
                                      onTap: () => _showEditDialog(tab),
                                      child: const Text('Edit'),
                                    ),
                                    PopupMenuItem(
                                      onTap: () => _deleteTab(tab['id']),
                                      child: const Text(
                                        'Delete',
                                        style: TextStyle(color: Colors.red),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateDialog,
        child: const Icon(Icons.add),
      ),
    );
  }
}
