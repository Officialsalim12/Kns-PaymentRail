import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../../core/config/app_config.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/admin_provider.dart';

class PaymentFormPage extends ConsumerStatefulWidget {
  const PaymentFormPage({super.key});

  @override
  ConsumerState<PaymentFormPage> createState() => _PaymentFormPageState();
}

class _PaymentFormPageState extends ConsumerState<PaymentFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _memberIdController = TextEditingController();
  final _amountController = TextEditingController();
  final _balanceController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _paymentDateController = TextEditingController();
  
  String _selectedMemberId = '';
  String _selectedPaymentMethod = 'afrimoney';
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _paymentDateController.text = DateFormat('yyyy-MM-dd').format(DateTime.now());
  }

  @override
  void dispose() {
    _memberIdController.dispose();
    _amountController.dispose();
    _balanceController.dispose();
    _descriptionController.dispose();
    _paymentDateController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      setState(() {
        _paymentDateController.text = DateFormat('yyyy-MM-dd').format(picked);
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      final authAsync = ref.read(authProvider);
      final user = authAsync.value;
      if (user == null) throw Exception('User not found');

      final userProfile = await dataSource.getUserProfile(user.id);
      if (userProfile == null || userProfile['organization_id'] == null) {
        throw Exception('Organization not found');
      }

      final amount = double.parse(_amountController.text);
      final balanceToAdd = _balanceController.text.isNotEmpty
          ? double.tryParse(_balanceController.text) ?? 0
          : 0;

      String paymentDescription = _descriptionController.text;
      if (balanceToAdd > 0) {
        paymentDescription = paymentDescription.isNotEmpty
            ? '$paymentDescription [BALANCE_ADDED:$balanceToAdd]'
            : '[BALANCE_ADDED:$balanceToAdd]';
      }

      final payment = await dataSource.createPayment({
        'organization_id': userProfile['organization_id'],
        'member_id': _selectedMemberId,
        'amount': amount,
        'payment_date': DateTime.now().toIso8601String(),
        'payment_method': 'online',
        'description': paymentDescription,
        'created_by': user.id,
        'payment_status': 'pending',
      });

      try {
        final response = await dataSource.client.functions.invoke(
          'create-monime-checkout',
          body: {
            'paymentId': payment['id'],
            'amount': amount,
            'currency': 'SLE',
            'description': paymentDescription,
            'successUrl': '${AppConfig.webAppUrl}/payment-success?payment_id=${payment['id']}',
            'cancelUrl': '${AppConfig.webAppUrl}/payment-cancelled?payment_id=${payment['id']}',
            'metadata': {
              'payment_id': payment['id'],
              'organization_id': userProfile['organization_id'],
              'member_id': _selectedMemberId,
            },
          },
        );

        if (response.data != null && response.data['checkoutSession'] != null) {
          final checkoutUrl = response.data['checkoutSession']['url'];
          if (mounted) {
            Navigator.pop(context);
            final uri = Uri.parse(checkoutUrl);
            if (await canLaunchUrl(uri)) {
              await launchUrl(uri, mode: LaunchMode.externalApplication);
            } else {
              try { await dataSource.deletePayment(payment['id']); } catch (e) {}
              throw Exception('Could not launch checkout URL');
            }
          }
        } else {
          try { await dataSource.deletePayment(payment['id']); } catch (e) {}
          throw Exception('Failed to create checkout session');
        }
      } catch (e) {
        print('Checkout creation error: $e');
        
        // Clean up payment if any error occurred during checkout creation
        try {
          await dataSource.deletePayment(payment['id']);
        } catch (cleanupError) {
          print('Error cleaning up payment after error: $cleanupError');
        }
        
        if (balanceToAdd > 0) {
          final members = await dataSource.getMembers(userProfile['organization_id']);
          final member = members.firstWhere(
            (m) => m['id'] == _selectedMemberId,
            orElse: () => <String, dynamic>{},
          );
          if (member.isNotEmpty) {
            final currentBalance = (member['unpaid_balance'] ?? 0).toDouble();
            final newBalance = currentBalance + balanceToAdd;
            await dataSource.updateMember(_selectedMemberId, {
              'unpaid_balance': newBalance,
            });
          }
        }

        try {
          await dataSource.generateReceipt(
            paymentId: payment['id'],
            organizationId: userProfile['organization_id'],
            memberId: _selectedMemberId,
          );
        } catch (receiptError) {
          print('Receipt generation error: $receiptError');
        }

        if (mounted) {
          Navigator.pop(context, true);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Payment recorded (checkout unavailable, using manual mode)'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final membersAsync = ref.watch(adminActiveMembersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Payment'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Text(
                    _error!,
                    style: TextStyle(color: Colors.red.shade700),
                  ),
                ),
              membersAsync.when(
                data: (members) {
                  if (members.isEmpty) {
                    return const Card(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('No active members available'),
                      ),
                    );
                  }

                  return DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      labelText: 'Member *',
                      border: OutlineInputBorder(),
                    ),
                    value: _selectedMemberId.isEmpty ? null : _selectedMemberId,
                    items: members.map((member) {
                      return DropdownMenuItem<String>(
                        value: member['id'],
                        child: Text(
                          '${member['full_name']} (${member['membership_id']})',
                        ),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() => _selectedMemberId = value ?? '');
                    },
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please select a member';
                      }
                      return null;
                    },
                  );
                },
                loading: () => const LinearProgressIndicator(),
                error: (error, stack) => Text('Error loading members: $error'),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _amountController,
                decoration: const InputDecoration(
                  labelText: 'Payment Amount *',
                  border: OutlineInputBorder(),
                  helperText: 'Amount for this payment',
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter payment amount';
                  }
                  final amount = double.tryParse(value);
                  if (amount == null || amount <= 0) {
                    return 'Please enter a valid amount';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _balanceController,
                decoration: const InputDecoration(
                  labelText: 'Add to Balance (Optional)',
                  border: OutlineInputBorder(),
                  helperText: 'Additional balance to add to member\'s account',
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _paymentDateController,
                decoration: const InputDecoration(
                  labelText: 'Payment Date *',
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(Icons.calendar_today),
                ),
                readOnly: true,
                onTap: () => _selectDate(context),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please select a payment date';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(
                  labelText: 'Payment Method *',
                  border: OutlineInputBorder(),
                ),
                value: _selectedPaymentMethod,
                items: const [
                  DropdownMenuItem(value: 'afrimoney', child: Text('Afrimoney')),
                  DropdownMenuItem(value: 'orangemoney', child: Text('Orangemoney')),
                ],
                onChanged: (value) {
                  setState(() => _selectedPaymentMethod = value ?? 'afrimoney');
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Create Payment'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

