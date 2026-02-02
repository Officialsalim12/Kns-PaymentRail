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
  bool _agreedToTerms = false;

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

    if (!_agreedToTerms) {
      setState(() {
        _error =
            'You must agree to the Terms of Service and Privacy Policy to continue';
      });
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
      final timestamp =
          DateTime.now().millisecondsSinceEpoch.toRadixString(36).toUpperCase();
      final randomStr = (100000 +
              (999999 - 100000) *
                  (DateTime.now().millisecondsSinceEpoch % 1000) /
                  1000)
          .toInt()
          .toString();
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
            'message':
                '${_fullNameController.text.trim()} (${membershipId}) has requested to join your organization and is pending approval.',
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
        body: Container(
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                const Color(0xFFE0F2FE),
                const Color(0xFFF0F9FF),
                Colors.white,
              ],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0.0, end: 1.0),
                    duration: const Duration(milliseconds: 800),
                    curve: Curves.elasticOut,
                    builder: (context, value, child) {
                      return Transform.scale(
                        scale: value,
                        child: child,
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.green.shade500,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.green.withOpacity(0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: const Icon(Icons.check_rounded,
                          size: 64, color: Colors.white),
                    ),
                  ),
                  const SizedBox(height: 48),
                  const Text(
                    'Application Received!',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Your membership request for ${_selectedOrganization?['name']} is now pending review. You will receive an email once approved.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.blueGrey.shade600,
                      fontSize: 16,
                      height: 1.6,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 64),
                  const Text(
                    'Returning to login...',
                    style: TextStyle(
                      color: Colors.blueGrey,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: 40,
                    height: 40,
                    child: CircularProgressIndicator(
                      strokeWidth: 3,
                      valueColor: AlwaysStoppedAnimation<Color>(
                          Theme.of(context).primaryColor),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Container(
              height: 240,
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
                  bottomLeft: Radius.circular(40),
                  bottomRight: Radius.circular(40),
                ),
                boxShadow: [
                  BoxShadow(
                    color:
                        Theme.of(context).colorScheme.primary.withOpacity(0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Stack(
                children: [
                  Positioned(
                    top: -50,
                    right: -50,
                    child: Container(
                      width: 200,
                      height: 200,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withOpacity(0.05),
                      ),
                    ),
                  ),
                  SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              IconButton(
                                onPressed: () => context.pop(),
                                icon: const Icon(
                                    Icons.arrow_back_ios_new_rounded,
                                    color: Colors.white,
                                    size: 20),
                                style: IconButton.styleFrom(
                                  backgroundColor:
                                      Colors.white.withOpacity(0.15),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                              const Spacer(),
                              Image.asset(
                                'assets/images/logo_placeholder.png',
                                height: 32,
                                color: Colors.white,
                                errorBuilder: (c, e, s) => const Icon(
                                    Icons.account_balance_rounded,
                                    color: Colors.white,
                                    size: 32),
                              ),
                            ],
                          ),
                          const SizedBox(height: 32),
                          const Text(
                            'Member Onboarding',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 32,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -1,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Join an organization and start managing payments',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.8),
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(24, 32, 24, 48),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                if (_error != null) _buildErrorMessage(),
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.blue.shade50),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.blue.shade900.withOpacity(0.02),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _buildSectionHeader('Personal Identity'),
                        const SizedBox(height: 20),
                        _buildTextField(
                          controller: _fullNameController,
                          label: 'Full Legal Name',
                          hint: 'e.g. John Doe',
                          icon: Icons.person_rounded,
                        ),
                        const SizedBox(height: 16),
                        _buildTextField(
                          controller: _emailController,
                          label: 'Email Address',
                          hint: 'john@example.com',
                          icon: Icons.alternate_email_rounded,
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 16),
                        _buildTextField(
                          controller: _passwordController,
                          label: 'Security Password',
                          hint: 'Min. 6 characters',
                          icon: Icons.lock_open_rounded,
                          isPassword: true,
                        ),
                        const SizedBox(height: 32),
                        _buildSectionHeader('Organization Link'),
                        const SizedBox(height: 20),
                        if (_isLoadingOrgs)
                          const Center(child: CircularProgressIndicator())
                        else
                          _buildOrgDropdown(),
                        const SizedBox(height: 32),
                        _buildTermsAndConditions(),
                        const SizedBox(height: 40),
                        ElevatedButton(
                          onPressed: _isLoading ? null : _handleSubmit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Theme.of(context).primaryColor,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16)),
                            elevation: 8,
                            shadowColor:
                                Theme.of(context).primaryColor.withOpacity(0.4),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white),
                                )
                              : const Text(
                                  'Complete Registration',
                                  style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.5),
                                ),
                        ),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Already registered?',
                              style: TextStyle(
                                  color: Colors.blueGrey.shade500,
                                  fontWeight: FontWeight.w500),
                            ),
                            TextButton(
                              onPressed: () => context.go('/login'),
                              child: Text(
                                'Sign In',
                                style: TextStyle(
                                  color: Theme.of(context).primaryColor,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 16,
          decoration: BoxDecoration(
            color: Theme.of(context).primaryColor,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          title.toUpperCase(),
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w900,
            color: Colors.blue.shade900,
            letterSpacing: 1,
          ),
        ),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    bool isPassword = false,
    TextInputType? keyboardType,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: isPassword,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        floatingLabelBehavior: FloatingLabelBehavior.always,
        prefixIcon: Icon(icon, size: 20, color: Colors.blueGrey.shade400),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.blueGrey.shade200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.blueGrey.shade200),
        ),
        filled: true,
        fillColor: Colors.blueGrey.shade50.withOpacity(0.5),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) return 'This field is required';
        if (isPassword && value.length < 6) return 'Minimum 6 characters';
        if (keyboardType == TextInputType.emailAddress && !value.contains('@'))
          return 'Invalid email';
        return null;
      },
    );
  }

  Widget _buildOrgDropdown() {
    return DropdownButtonFormField<Map<String, dynamic>>(
      decoration: InputDecoration(
        labelText: 'Select Organization',
        floatingLabelBehavior: FloatingLabelBehavior.always,
        prefixIcon: Icon(Icons.business_rounded,
            size: 20, color: Colors.blueGrey.shade400),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
        filled: true,
        fillColor: Colors.blueGrey.shade50.withOpacity(0.5),
      ),
      value: _selectedOrganization,
      items: _organizations.map((org) {
        return DropdownMenuItem<Map<String, dynamic>>(
          value: org,
          child: Text(
            org['name'],
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
          ),
        );
      }).toList(),
      onChanged: (value) => setState(() => _selectedOrganization = value),
      validator: (value) =>
          value == null ? 'Please select your organization' : null,
    );
  }

  Widget _buildTermsAndConditions() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50.withOpacity(0.3),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 24,
            height: 24,
            child: Checkbox(
              value: _agreedToTerms,
              onChanged: (v) => setState(() => _agreedToTerms = v ?? false),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text.rich(
              TextSpan(
                text: 'By checking this, I agree to the ',
                style: TextStyle(
                    color: Colors.blueGrey.shade600, fontSize: 13, height: 1.4),
                children: [
                  TextSpan(
                    text: 'Terms of Service',
                    style: TextStyle(
                        color: Theme.of(context).primaryColor,
                        fontWeight: FontWeight.bold),
                  ),
                  const TextSpan(text: ' and '),
                  TextSpan(
                    text: 'Privacy Policy',
                    style: TextStyle(
                        color: Theme.of(context).primaryColor,
                        fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorMessage() {
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.shade100),
      ),
      child: Row(
        children: [
          Icon(Icons.warning_rounded, color: Colors.red.shade700, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _error!,
              style: TextStyle(
                  color: Colors.red.shade900,
                  fontWeight: FontWeight.w500,
                  fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}
