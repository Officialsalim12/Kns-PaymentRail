import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class OrganizationSettingsPage extends ConsumerStatefulWidget {
  const OrganizationSettingsPage({super.key});

  @override
  ConsumerState<OrganizationSettingsPage> createState() =>
      _OrganizationSettingsPageState();
}

class _OrganizationSettingsPageState
    extends ConsumerState<OrganizationSettingsPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _typeController = TextEditingController();
  final _phoneController = TextEditingController();
  final _descriptionController = TextEditingController();

  Map<String, dynamic>? _organization;
  File? _logoFile;
  String? _logoPreview;
  bool _isLoading = false;
  bool _isLoadingData = true;
  String? _error;
  String? _success;

  @override
  void initState() {
    super.initState();
    _loadOrganization();
  }

  Future<void> _loadOrganization() async {
    try {
      final authAsync = ref.read(authProvider);
      final user = authAsync.value;
      if (user == null) {
        throw Exception('User not found');
      }

      final dataSource = ref.read(supabaseDataSourceProvider);
      final userProfile = await dataSource.getUserProfile(user.id);
      if (userProfile == null || userProfile['organization_id'] == null) {
        throw Exception('Organization not found');
      }

      final org =
          await dataSource.getOrganization(userProfile['organization_id']);
      if (org == null) {
        throw Exception('Organization not found');
      }

      setState(() {
        _organization = org;
        _nameController.text = org['name'] ?? '';
        _typeController.text = org['organization_type'] ?? '';
        _phoneController.text = org['phone_number'] ?? '';
        _descriptionController.text = org['description'] ?? '';
        _isLoadingData = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoadingData = false;
      });
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );

    if (pickedFile != null) {
      final file = File(pickedFile.path);
      if (file.lengthSync() > 5 * 1024 * 1024) {
        setState(() {
          _error = 'Image size must be less than 5MB';
        });
        return;
      }
      setState(() {
        _logoFile = file;
        _logoPreview = pickedFile.path;
        _error = null;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _error = null;
      _success = null;
      _isLoading = true;
    });

    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      String? logoUrl = _organization?['logo_url'];

      // Upload logo if new one is selected
      if (_logoFile != null) {
        // Delete old logo if exists
        if (_organization?['logo_url'] != null) {
          try {
            final oldPath = _organization!['logo_url'].split('/').last;
            await dataSource.client.storage
                .from('logos')
                .remove(['organizations/$oldPath']);
          } catch (e) {
            // Ignore errors when deleting old logo
          }
        }

        // Upload new logo
        final fileExt = _logoFile!.path.split('.').last;
        final fileName =
            '${_organization!['id']}-${DateTime.now().millisecondsSinceEpoch}.$fileExt';
        final filePath = 'organizations/$fileName';

        await dataSource.client.storage
            .from('logos')
            .upload(filePath, _logoFile!);

        final publicUrl =
            dataSource.client.storage.from('logos').getPublicUrl(filePath);

        logoUrl = publicUrl;
      }

      // Update organization
      final updateData = <String, dynamic>{
        'name': _nameController.text.trim(),
        'organization_type': _typeController.text.trim(),
        'phone_number': _phoneController.text.trim().isEmpty
            ? null
            : _phoneController.text.trim(),
        'description': _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
      };

      if (logoUrl != null && logoUrl != _organization?['logo_url']) {
        updateData['logo_url'] = logoUrl;
      }

      await dataSource.updateOrganization(_organization!['id'], updateData);

      setState(() {
        _success = 'Organization updated successfully!';
        _logoFile = null;
        _logoPreview = null;
        _isLoading = false;
      });

      // Reload organization data
      await _loadOrganization();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Organization updated successfully!'),
            backgroundColor: Colors.green,
          ),
        );
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
    _nameController.dispose();
    _typeController.dispose();
    _phoneController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingData) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_organization == null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded,
                  size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text(_error ?? 'Organization not found',
                  style: const TextStyle(
                      color: Colors.red, fontWeight: FontWeight.bold)),
              const SizedBox(height: 24),
              ElevatedButton(
                  onPressed: _loadOrganization, child: const Text('Retry')),
            ],
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
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF0F172A),
                    Color(0xFF334155),
                  ],
                ),
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(32),
                  bottomRight: Radius.circular(32),
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0F172A).withOpacity(0.3),
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
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.arrow_back_ios_new_rounded,
                        color: Colors.white, size: 20),
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white.withOpacity(0.1),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 32),
                  const Text(
                    'Organization Settings',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Manage your organization profile and configuration',
                    style: TextStyle(
                      color: Colors.blueGrey.shade400,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
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
                if (_error != null) _buildAlert(Text(_error!), Colors.red),
                if (_success != null)
                  _buildAlert(Text(_success!), Colors.green),
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildSectionCard(
                        title: 'Branding',
                        subtitle: 'Customize your organization\'s look',
                        children: [
                          Row(
                            children: [
                              _buildLogoPreview(),
                              const SizedBox(width: 24),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildSmallButton(
                                      label: 'Change Logo',
                                      icon: Icons.upload_rounded,
                                      onPressed: _pickImage,
                                    ),
                                    const SizedBox(height: 8),
                                    const Text('PNG or JPG, max 5MB',
                                        style: TextStyle(
                                            color: Colors.blueGrey,
                                            fontSize: 11)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      _buildSectionCard(
                        title: 'Core Profile',
                        subtitle: 'Update your official business details',
                        children: [
                          _buildTextField(
                            controller: _nameController,
                            label: 'Organization Name',
                            icon: Icons.business_rounded,
                            validator: (v) =>
                                v?.isEmpty ?? true ? 'Name is required' : null,
                          ),
                          const SizedBox(height: 20),
                          _buildTextField(
                            controller: _typeController,
                            label: 'Industry / Type',
                            icon: Icons.category_rounded,
                            validator: (v) =>
                                v?.isEmpty ?? true ? 'Type is required' : null,
                          ),
                          const SizedBox(height: 20),
                          _buildTextField(
                            controller: _phoneController,
                            label: 'Business Phone',
                            icon: Icons.phone_rounded,
                            keyboardType: TextInputType.phone,
                          ),
                          const SizedBox(height: 20),
                          _buildTextField(
                            controller: _descriptionController,
                            label: 'Description',
                            icon: Icons.description_rounded,
                            maxLines: 3,
                          ),
                        ],
                      ),
                      const SizedBox(height: 48),
                      _buildSubmitButton(),
                    ],
                  ),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAlert(Widget content, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: DefaultTextStyle(
        style:
            TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 13),
        child: content,
      ),
    );
  }

  Widget _buildSectionCard(
      {required String title,
      required String subtitle,
      required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.blueGrey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.blueGrey.shade900.withOpacity(0.02),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                  color: Color(0xFF0F172A))),
          const SizedBox(height: 4),
          Text(subtitle,
              style: TextStyle(
                  color: Colors.blueGrey.shade400,
                  fontSize: 13,
                  fontWeight: FontWeight.w500)),
          const SizedBox(height: 24),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    String? Function(String?)? validator,
    TextInputType? keyboardType,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      validator: validator,
      keyboardType: keyboardType,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 20, color: Colors.blueGrey.shade400),
        filled: true,
        fillColor: const Color(0xFFF1F5F9).withOpacity(0.5),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF0284C7), width: 1.5),
        ),
        labelStyle: TextStyle(color: Colors.blueGrey.shade500, fontSize: 14),
        floatingLabelStyle: const TextStyle(
            color: Color(0xFF0284C7), fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildSmallButton(
      {required String label,
      required IconData icon,
      required VoidCallback onPressed}) {
    return TextButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 16),
      label: Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
      style: TextButton.styleFrom(
        foregroundColor: const Color(0xFF0284C7),
        backgroundColor: const Color(0xFFF0F9FF),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  Widget _buildSubmitButton() {
    return ElevatedButton(
      onPressed: _isLoading ? null : _handleSubmit,
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 10,
        shadowColor: const Color(0xFF0F172A).withOpacity(0.3),
      ),
      child: _isLoading
          ? const SizedBox(
              height: 20,
              width: 20,
              child: CircularProgressIndicator(
                  strokeWidth: 2, color: Colors.white))
          : const Text('Publish Changes',
              style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                  letterSpacing: 0.5)),
    );
  }

  Widget _buildLogoPreview() {
    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.blueGrey.shade100),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: _logoPreview != null
            ? Image.file(File(_logoPreview!), fit: BoxFit.cover)
            : _organization?['logo_url'] != null
                ? Image.network(
                    _organization!['logo_url'],
                    fit: BoxFit.cover,
                    errorBuilder: (c, e, s) => _buildLogoPlaceholder(),
                  )
                : _buildLogoPlaceholder(),
      ),
    );
  }

  Widget _buildLogoPlaceholder() {
    final name = _nameController.text.isNotEmpty
        ? _nameController.text
        : (_organization?['name']?.toString() ?? 'O');
    return Center(
      child: Text(
        name[0].toUpperCase(),
        style: const TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w900,
            color: Color(0xFF94A3B8)),
      ),
    );
  }
}
