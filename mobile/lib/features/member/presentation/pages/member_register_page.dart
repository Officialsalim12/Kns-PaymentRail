import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class MemberRegisterPage extends ConsumerStatefulWidget {
  const MemberRegisterPage({super.key});

  @override
  ConsumerState<MemberRegisterPage> createState() => _MemberRegisterPageState();
}

class _MemberRegisterPageState extends ConsumerState<MemberRegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _organizationController = TextEditingController();
  
  List<Map<String, dynamic>> _organizations = [];
  Map<String, dynamic>? _selectedOrganization;
  bool _isLoading = false;
  bool _isLoadingOrgs = true;
  String? _error;
  bool _success = false;

  @override
  void initState() {
    super.initState();
    _loadOrganizations();
  }

  Future<void> _loadOrganizations() async {
    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      final orgs = await dataSource.getOrganizations(status: 'approved');
      setState(() {
        _organizations = orgs;
        _isLoadingOrgs = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load organizations: ${e.toString()}';
        _isLoadingOrgs = false;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedOrganization == null) {
      setState(() {
        _error = 'Please select your organization';
      });
      return;
    }

    setState(() {
      _error = null;
      _isLoading = true;
    });

    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      final supabase = Supabase.instance.client;

      // Step 1: Sign up the member user
      final authResponse = await supabase.auth.signUp(
        email: _emailController.text.trim(),
        password: _passwordController.text.trim(),
        emailRedirectTo: null,
        data: {
          'full_name': _fullNameController.text.trim(),
        },
      );

      if (authResponse.user == null) {
        throw Exception('Failed to create user account');
      }

      // Step 2: Create user profile
      await dataSource.createUserProfile({
        'id': authResponse.user!.id,
        'email': _emailController.text.trim(),
        'full_name': _fullNameController.text.trim(),
        'role': 'member',
        'organization_id': _selectedOrganization!['id'],
        'phone_number': null,
      });

      // Step 3: Generate membership ID
      final timestamp = DateTime.now().millisecondsSinceEpoch.toRadixString(36).toUpperCase();
      final randomStr = (100000 + (999999 - 100000) * (DateTime.now().millisecondsSinceEpoch % 1000) / 1000).toInt().toString();
      final membershipId = 'MEM-$timestamp-$randomStr';

      // Step 4: Create member record
      final newMember = await dataSource.createMember({
        'organization_id': _selectedOrganization!['id'],
        'user_id': authResponse.user!.id,
        'full_name': _fullNameController.text.trim(),
        'email': _emailController.text.trim(),
        'membership_id': membershipId,
        'status': 'pending',
        'unpaid_balance': 0.0,
        'total_paid': 0.0,
      });

      // Step 5: Notify admin about new member request
      if (newMember.containsKey('id')) {
        // Get organization admin
        final orgAdmins = await supabase
            .from('users')
            .select('id')
            .eq('organization_id', _selectedOrganization!['id'])
            .eq('role', 'org_admin')
            .limit(1);
        
        if (orgAdmins.isNotEmpty && orgAdmins[0]['id'] != null) {
          await supabase.from('notifications').insert({
            'organization_id': _selectedOrganization!['id'],
            'recipient_id': orgAdmins[0]['id'],
            'member_id': newMember['id'],
            'title': 'New Member Request',
            'message': '${_fullNameController.text.trim()} (${membershipId}) has requested to join your organization and is pending approval.',
            'type': 'member_request',
          });
        }
      }

      setState(() {
        _success = true;
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Registration successful! Redirecting to login...'),
            backgroundColor: Colors.green,
          ),
        );
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            context.go('/login');
          }
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _organizationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_success) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Registration'),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.check_circle, size: 64, color: Colors.green),
                const SizedBox(height: 16),
                Text(
                  'Registration Submitted!',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Your member account has been created and linked to your organization. An admin may need to approve your membership before you get full access.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Membership Registration'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Register your membership and link it to your organization',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    border: Border.all(color: Colors.red.shade200),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _error!,
                    style: TextStyle(color: Colors.red.shade700),
                  ),
                ),

              TextFormField(
                controller: _fullNameController,
                decoration: const InputDecoration(
                  labelText: 'Full Name *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your full name';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email Address *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your email';
                  }
                  if (!value.contains('@')) {
                    return 'Please enter a valid email';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Password *',
                  border: OutlineInputBorder(),
                  helperText: 'Minimum 6 characters',
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter a password';
                  }
                  if (value.length < 6) {
                    return 'Password must be at least 6 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              if (_isLoadingOrgs)
                const Center(child: CircularProgressIndicator())
              else
                DropdownButtonFormField<Map<String, dynamic>>(
                  decoration: const InputDecoration(
                    labelText: 'Organization *',
                    border: OutlineInputBorder(),
                  ),
                  value: _selectedOrganization,
                  items: _organizations.map((org) {
                    return DropdownMenuItem<Map<String, dynamic>>(
                      value: org,
                      child: Text('${org['name']} (${org['organization_type'] ?? 'N/A'})'),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      _selectedOrganization = value;
                    });
                  },
                  validator: (value) {
                    if (value == null) {
                      return 'Please select an organization';
                    }
                    return null;
                  },
                ),
              const SizedBox(height: 32),

              ElevatedButton(
                onPressed: _isLoading ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Register'),
              ),
              const SizedBox(height: 16),

              TextButton(
                onPressed: () => context.push('/login'),
                child: const Text('Already have an account? Sign in'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

