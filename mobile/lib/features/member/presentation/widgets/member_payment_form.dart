import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/config/app_config.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class MemberPaymentForm extends ConsumerStatefulWidget {
  final String memberId;
  final String tabName;
  final String tabType; // 'payment' or 'donation'
  final double? monthlyCost;

  const MemberPaymentForm({
    super.key,
    required this.memberId,
    required this.tabName,
    required this.tabType,
    this.monthlyCost,
  });

  @override
  ConsumerState<MemberPaymentForm> createState() => _MemberPaymentFormState();
}

class _MemberPaymentFormState extends ConsumerState<MemberPaymentForm> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  String _months = '1';
  DateTime _paymentDate = DateTime.now();
  bool _isLoading = false;

  double get _totalAmount {
    if (widget.tabType == 'payment' && widget.monthlyCost != null) {
      final months = int.tryParse(_months) ?? 1;
      return widget.monthlyCost! * months;
    }
    return double.tryParse(_amountController.text) ?? 0;
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _paymentDate,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null && picked != _paymentDate) {
      setState(() {
        _paymentDate = picked;
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      final authAsync = ref.read(authProvider);
      final user = authAsync.value;
      if (user == null) throw Exception('User not found. Please log in again.');

      // Fetch member by record ID directly (standardized with web version)
      final member = await dataSource.getMemberById(widget.memberId);
      if (member == null || member['organization_id'] == null) {
        throw Exception(
            'Member record not found or organization ID is missing.');
      }

      final paymentDescription = widget.tabName;
      final paymentAmount =
          widget.tabType == 'payment' && widget.monthlyCost != null
              ? _totalAmount
              : double.parse(_amountController.text);

      final payment = await dataSource.createPayment({
        'organization_id': member['organization_id'],
        'member_id': widget.memberId,
        'amount': paymentAmount,
        'payment_date': _paymentDate.toIso8601String(), // Use the selected date
        'payment_method': 'online',
        'description': paymentDescription,
        'created_by': user.id,
        'payment_status': 'pending',
      });

      try {
        debugPrint('Invoking create-monime-checkout edge function...');
        final response = await dataSource.client.functions.invoke(
          'create-monime-checkout',
          body: {
            'paymentId': payment['id'],
            'amount': paymentAmount,
            'currency': 'SLE',
            'description': paymentDescription,
            'successUrl':
                '${AppConfig.webAppUrl}/payment-success?payment_id=${payment['id']}',
            'cancelUrl':
                '${AppConfig.webAppUrl}/payment-cancelled?payment_id=${payment['id']}',
            'metadata': {
              'payment_id': payment['id'],
              'organization_id': member['organization_id'],
              'member_id': widget.memberId,
              'tab_name': widget.tabName,
              'tab_type': widget.tabType,
              if (widget.tabType == 'payment' &&
                  widget.monthlyCost != null &&
                  _months.isNotEmpty) ...{
                'months': _months,
                'monthly_cost': widget.monthlyCost!.toString(),
                'quantity': _months,
                'unit_price': widget.monthlyCost!.toString(),
              },
            },
          },
        );

        debugPrint('Edge function response: ${response.data}');

        if (response.data != null) {
          // The edge function might return redirectUrl directly or inside checkoutSession
          final String? checkoutUrl = response.data['redirectUrl'] ??
              (response.data['checkoutSession'] != null
                  ? response.data['checkoutSession']['url']
                  : null);

          if (checkoutUrl != null) {
            debugPrint('Launching checkout URL: $checkoutUrl');
            if (mounted) {
              Navigator.pop(context);
              final uri = Uri.parse(checkoutUrl);

              // Use externalApplication to ensure it opens in the device browser
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              } else {
                debugPrint(
                    'Could not launch URL via canLaunchUrl. Attempting launchUrl anyway.');
                try {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                } catch (launchError) {
                  debugPrint('Launch fallback failed: $launchError');
                  // Clean up payment if launch fails
                  await dataSource.deletePayment(payment['id']);
                  throw Exception(
                      'Could not launch checkout URL: $launchError');
                }
              }
            }
          } else {
            debugPrint('Error: Checkout session URL not found in response');
            await dataSource.deletePayment(payment['id']);
            throw Exception('Failed to create checkout session: URL missing');
          }
        } else {
          debugPrint('Error: Edge function returned null data');
          await dataSource.deletePayment(payment['id']);
          throw Exception('Failed to create checkout session: Empty response');
        }
      } catch (e) {
        debugPrint('Error during checkout creation/launch: $e');
        // Clean up payment if any error occurred during checkout creation
        try {
          await dataSource.deletePayment(payment['id']);
        } catch (cleanupError) {
          debugPrint('Error cleaning up payment after error: $cleanupError');
        }
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error creating payment: ${e.toString()}'),
              backgroundColor: Colors.red,
            ),
          );
        }
        rethrow;
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
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final isSmallScreen = screenHeight < 700;

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: screenHeight * 0.9,
        ),
        child: SingleChildScrollView(
          padding: EdgeInsets.all(isSmallScreen ? 16 : 24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        '${widget.tabType == 'payment' ? 'Pay Now' : 'Donate Here'} - ${widget.tabName}',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontSize: isSmallScreen ? 18 : 20,
                            ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                SizedBox(height: isSmallScreen ? 16 : 24),
                if (widget.tabType == 'payment' &&
                    widget.monthlyCost != null) ...[
                  DropdownButtonFormField<String>(
                    value: _months,
                    decoration: InputDecoration(
                      labelText: 'Number of Months *',
                      border: const OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: isSmallScreen ? 12 : 16,
                      ),
                    ),
                    items: List.generate(12, (index) {
                      final num = index + 1;
                      return DropdownMenuItem(
                        value: num.toString(),
                        child: Text('$num ${num == 1 ? 'Month' : 'Months'}'),
                      );
                    }),
                    onChanged: (value) {
                      if (value != null) {
                        setState(() => _months = value);
                      }
                    },
                  ),
                  SizedBox(height: isSmallScreen ? 12 : 16),
                  Container(
                    padding: EdgeInsets.all(isSmallScreen ? 12 : 16),
                    decoration: BoxDecoration(
                      color: Colors.blue[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.blue[200]!),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(
                              child: Text(
                                'Total Amount:',
                                style: TextStyle(
                                  fontSize: isSmallScreen ? 13 : 14,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.grey[700],
                                ),
                              ),
                            ),
                            Flexible(
                              child: Text(
                                CurrencyFormatter.format(_totalAmount),
                                style: TextStyle(
                                  fontSize: isSmallScreen ? 18 : 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue[700],
                                ),
                                textAlign: TextAlign.right,
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: isSmallScreen ? 4 : 6),
                        Text(
                          '$_months ${int.parse(_months) == 1 ? 'month' : 'months'} × ${CurrencyFormatter.format(widget.monthlyCost!)}',
                          style: TextStyle(
                            fontSize: isSmallScreen ? 11 : 12,
                            color: Colors.grey[600],
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: isSmallScreen ? 12 : 16),
                ] else ...[
                  TextFormField(
                    controller: _amountController,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      labelText: 'Amount *',
                      border: const OutlineInputBorder(),
                      prefixText: 'Le ',
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: isSmallScreen ? 12 : 16,
                      ),
                    ),
                    style: TextStyle(fontSize: isSmallScreen ? 14 : 16),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Amount is required';
                      }
                      final amount = double.tryParse(value);
                      if (amount == null || amount <= 0) {
                        return 'Please enter a valid amount';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: isSmallScreen ? 12 : 16),
                ],
                InkWell(
                  onTap: () => _selectDate(context),
                  child: InputDecorator(
                    decoration: InputDecoration(
                      labelText: 'Payment Date *',
                      border: const OutlineInputBorder(),
                      suffixIcon: const Icon(Icons.calendar_today),
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: isSmallScreen ? 12 : 16,
                      ),
                    ),
                    child: Text(
                      DateFormat('yyyy-MM-dd').format(_paymentDate),
                      style: TextStyle(
                        fontSize: isSmallScreen ? 14 : 16,
                      ),
                    ),
                  ),
                ),
                SizedBox(height: isSmallScreen ? 16 : 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed:
                            _isLoading ? null : () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          padding: EdgeInsets.symmetric(
                            vertical: isSmallScreen ? 12 : 14,
                          ),
                        ),
                        child: Text(
                          'Cancel',
                          style: TextStyle(fontSize: isSmallScreen ? 14 : 16),
                        ),
                      ),
                    ),
                    SizedBox(width: isSmallScreen ? 12 : 16),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          padding: EdgeInsets.symmetric(
                            vertical: isSmallScreen ? 12 : 14,
                          ),
                        ),
                        child: _isLoading
                            ? SizedBox(
                                height: isSmallScreen ? 18 : 20,
                                width: isSmallScreen ? 18 : 20,
                                child: const CircularProgressIndicator(
                                    strokeWidth: 2),
                              )
                            : Text(
                                widget.tabType == 'payment'
                                    ? 'Submit Payment'
                                    : 'Submit Donation',
                                style: TextStyle(
                                    fontSize: isSmallScreen ? 14 : 16),
                              ),
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
}
