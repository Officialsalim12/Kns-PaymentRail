import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class OrganizationSettingsPage extends ConsumerStatefulWidget {
  const OrganizationSettingsPage({super.key});

  @override
  ConsumerState<OrganizationSettingsPage> createState() => _OrganizationSettingsPageState();
}

class _OrganizationSettingsPageState extends ConsumerState<OrganizationSettingsPage> {
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

      final org = await dataSource.getOrganization(userProfile['organization_id']);
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
        final fileName = '${_organization!['id']}-${DateTime.now().millisecondsSinceEpoch}.$fileExt';
        final filePath = 'organizations/$fileName';

        await dataSource.client.storage
            .from('logos')
            .upload(filePath, _logoFile!);

        final publicUrl = dataSource.client.storage
            .from('logos')
            .getPublicUrl(filePath);

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
        appBar: AppBar(
          title: const Text('Organization Settings'),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_organization == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Organization Settings'),
        ),
        body: Center(
          child: Text(
            _error ?? 'Organization not found',
            style: TextStyle(color: Colors.red),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Organization Settings'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
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
                    border: Border.all(color: Colors.red.shade200),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _error!,
                    style: TextStyle(color: Colors.red.shade700),
                  ),
                ),

              if (_success != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    border: Border.all(color: Colors.green.shade200),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _success!,
                    style: TextStyle(color: Colors.green.shade700),
                  ),
                ),

              // Logo Section
              Text(
                'Organization Logo',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  if (_logoPreview != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(
                        File(_logoPreview!),
                        width: 128,
                        height: 128,
                        fit: BoxFit.contain,
                      ),
                    )
                  else if (_organization?['logo_url'] != null)
                    Image.network(
                      _organization!['logo_url'],
                      width: 128,
                      height: 128,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) =>
                          _buildLogoPlaceholder(),
                    )
                  else
                    _buildLogoPlaceholder(),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ElevatedButton.icon(
                          onPressed: _pickImage,
                          icon: const Icon(Icons.upload),
                          label: const Text('Choose File'),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Recommended: Square image, max 5MB',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Colors.grey[600],
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Organization Info
              Text(
                'Organization Information',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Organization Name *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter organization name';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _typeController,
                decoration: const InputDecoration(
                  labelText: 'Organization Type *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter organization type';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _descriptionController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  border: OutlineInputBorder(),
                ),
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
                    : const Text('Save Changes'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLogoPlaceholder() {
    return Container(
      width: 128,
      height: 128,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Center(
        child: Text(
          _nameController.text.isNotEmpty
              ? _nameController.text[0].toUpperCase()
              : _organization?['name']?.toString()[0].toUpperCase() ?? 'O',
          style: TextStyle(
            fontSize: 48,
            fontWeight: FontWeight.bold,
            color: Colors.grey[600],
          ),
        ),
      ),
    );
  }
}

