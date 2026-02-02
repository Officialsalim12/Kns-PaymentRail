import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import '../providers/admin_provider.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

/// One of the key admin features: Managing Payment Tabs.
///
/// This page allows organization administrators to configure "Payment Tabs" (categories)
/// that members will see on their dashboard. This includes:
/// - Creating new tabs (e.g., "Monthly Dues", "Building Fund", "Donation").
/// - Setting tab types (Payment, Subscription, Donation).
/// - Toggling visibility (Active/Inactive).
/// - Deleting tabs.
class PaymentTabsPage extends ConsumerWidget {
  const PaymentTabsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch the provider that fetches organization-wide tabs
    final tabsAsync = ref.watch(adminTabsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Payment Tabs',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: const Color(0xFF0F172A),
      ),
      body: tabsAsync.when(
        data: (tabs) {
          if (tabs.isEmpty) {
            return _buildEmptyState(context, ref);
          }

          return ListView.builder(
            padding: const EdgeInsets.all(24),
            itemCount: tabs.length,
            itemBuilder: (context, index) {
              final tab = tabs[index];
              return _buildTabItem(context, ref, tab);
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
            child: Text('Error loading tabs: $err',
                style: TextStyle(color: Colors.red))),
      ),
      // Show FAB only if there are existing tabs, otherwise the empty state has a button
      floatingActionButton: tabsAsync.hasValue && tabsAsync.value!.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: () => _showCreateTabDialog(context, ref),
              label: const Text('New Tab'),
              icon: const Icon(Icons.add),
              backgroundColor: Theme.of(context).primaryColor,
            )
          : null,
    );
  }

  /// Builds the empty state view when no tabs exist.
  Widget _buildEmptyState(BuildContext context, WidgetRef ref) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.tab_unselected_rounded,
              size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          const Text('No payment tabs configured yet.',
              style: TextStyle(color: Colors.blueGrey, fontSize: 16)),
          const SizedBox(height: 8),
          const Text('Create tabs to allow members to make payments.',
              style: TextStyle(color: Colors.grey, fontSize: 12)),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => _showCreateTabDialog(context, ref),
            icon: const Icon(Icons.add),
            label: const Text('Create First Tab'),
            style: ElevatedButton.styleFrom(
              padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabItem(
      BuildContext context, WidgetRef ref, Map<String, dynamic> tab) {
    final name = tab['tab_name'] ?? 'Unnamed';
    final type = tab['tab_type'] ?? 'payment';
    final isActive = tab['is_active'] ?? true;
    final monthlyCost = tab['monthly_cost'];
    final id = tab['id'];

    final isPaymentParams = type == 'payment';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.blueGrey.shade50),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color:
                (isPaymentParams ? Colors.blue : Colors.teal).withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(
            isPaymentParams
                ? Icons.payment_rounded
                : Icons.volunteer_activism_rounded,
            color: isPaymentParams ? Colors.blue : Colors.teal,
          ),
        ),
        title: Text(name,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(type.toUpperCase(),
                style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: Colors.blueGrey,
                    letterSpacing: 1.1)),
            if (monthlyCost != null)
              Padding(
                padding: const EdgeInsets.only(top: 2.0),
                child: Text('Cost: \$${monthlyCost}',
                    style: const TextStyle(
                        fontSize: 12,
                        color: Colors.green,
                        fontWeight: FontWeight.w600)),
              ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Switch(
              value: isActive,
              activeColor: Colors.green,
              onChanged: (val) async {
                try {
                  final dataSource = ref.read(supabaseDataSourceProvider);
                  await dataSource.updateMemberTab(id, {'is_active': val});
                  // Refresh the list to reflect changes
                  ref.invalidate(adminTabsProvider);
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Error updating tab: $e')),
                    );
                  }
                }
              },
            ),
          ],
        ),
        onLongPress: () {
          _showDeleteDialog(context, ref, id, name);
        },
      ),
    );
  }

  /// Dialog to create a new payment tab.
  Future<void> _showCreateTabDialog(BuildContext context, WidgetRef ref) async {
    final nameController = TextEditingController();
    final costController = TextEditingController();
    String selectedType = 'payment'; // Default type
    final formKey = GlobalKey<FormState>();

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Create Payment Tab'),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: nameController,
                    decoration: InputDecoration(
                      labelText: 'Tab Name',
                      hintText: 'e.g. Monthly Dues',
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12)),
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Please enter a name' : null,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: selectedType,
                    decoration: InputDecoration(
                      labelText: 'Type',
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12)),
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    items: const [
                      DropdownMenuItem(
                          value: 'payment', child: Text('Standard Payment')),
                      DropdownMenuItem(
                          value: 'donation', child: Text('Donation')),
                      DropdownMenuItem(
                          value: 'subscription', child: Text('Subscription')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => selectedType = val);
                    },
                  ),
                  // Show cost field only for subscriptions
                  if (selectedType == 'subscription') ...[
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: costController,
                      decoration: InputDecoration(
                        labelText: 'Monthly Cost',
                        prefixText: '\$',
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12)),
                        contentPadding:
                            EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(
                            RegExp(r'^\d+\.?\d{0,2}'))
                      ],
                      validator: (v) => v == null || v.isEmpty
                          ? 'Required for subscription'
                          : null,
                    ),
                  ],
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (formKey.currentState!.validate()) {
                  try {
                    final authState = ref.read(authProvider);
                    final user = authState.value;
                    if (user == null) return;

                    final dataSource = ref.read(supabaseDataSourceProvider);
                    final userProfile =
                        await dataSource.getUserProfile(user.id);
                    final orgId = userProfile?['organization_id'];

                    if (orgId == null) {
                      throw 'Organization ID not found for this user.';
                    }

                    // Create the new tab in the database
                    await dataSource.createMemberTab({
                      'organization_id': orgId,
                      'tab_name': nameController.text.trim(),
                      'tab_type': selectedType,
                      'monthly_cost': costController.text.isNotEmpty
                          ? double.parse(costController.text)
                          : null,
                      'is_active': true,
                    });

                    if (context.mounted) Navigator.pop(context);

                    // Refresh the list
                    ref.invalidate(adminTabsProvider);
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Error creating tab: $e')),
                      );
                    }
                  }
                }
              },
              style: ElevatedButton.styleFrom(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  /// Dialog to confirm deletion of a tab.
  Future<void> _showDeleteDialog(
      BuildContext context, WidgetRef ref, String id, String name) async {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Tab?'),
        content: Text(
            'Are you sure you want to delete "$name"?\n\nThis may affect existing payments linked to this tab.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              try {
                final dataSource = ref.read(supabaseDataSourceProvider);
                await dataSource.deleteMemberTab(id);
                if (context.mounted) Navigator.pop(context);
                ref.invalidate(adminTabsProvider);
              } catch (e) {
                if (context.mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error deleting tab: $e')),
                  );
                }
              }
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
