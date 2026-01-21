import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/admin_messages_provider.dart';

class MessagesManagementPage extends ConsumerStatefulWidget {
  const MessagesManagementPage({super.key});

  @override
  ConsumerState<MessagesManagementPage> createState() => _MessagesManagementPageState();
}

class _MessagesManagementPageState extends ConsumerState<MessagesManagementPage> {
  bool _showForm = false;
  bool _isLoading = false;
  String? _error;
  String? _success;
  String _recipientType = 'all';
  String? _selectedMemberId;
  final _titleController = TextEditingController();
  final _messageController = TextEditingController();

  @override
  void dispose() {
    _titleController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    if (_titleController.text.trim().isEmpty || _messageController.text.trim().isEmpty) {
      setState(() {
        _error = 'Please fill in all fields';
      });
      return;
    }

    if (_recipientType == 'individual' && _selectedMemberId == null) {
      setState(() {
        _error = 'Please select a member';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
      _success = null;
    });

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

      final organizationId = userProfile['organization_id'];
      final messagesData = await ref.read(adminMessagesProvider.future);
      final members = messagesData?['members'] as List<Map<String, dynamic>>? ?? [];

      int sentCount = 0;

      if (_recipientType == 'all') {
        // Send to all active members
        final activeMembers = members.where((m) => m['user_id'] != null).toList();
        if (activeMembers.isEmpty) {
          throw Exception('No active members found with user accounts');
        }

        // Create notifications for all members
        final notifications = activeMembers.map((member) {
          return {
            'organization_id': organizationId,
            'sender_id': user.id,
            'recipient_id': member['user_id'],
            'member_id': member['id'],
            'title': _titleController.text.trim(),
            'message': _messageController.text.trim(),
            'type': 'info',
          };
        }).toList();

        // Insert notifications one by one (Supabase batch insert)
        for (final notification in notifications) {
          await dataSource.client.from('notifications').insert(notification);
        }

        sentCount = activeMembers.length;
        setState(() {
          _success = 'Message sent successfully to $sentCount member(s)! They will see it in their notifications.';
        });
      } else {
        // Send to individual member
        final selectedMember = members.firstWhere(
          (m) => m['id'] == _selectedMemberId,
          orElse: () => {},
        );

        if (selectedMember.isEmpty || selectedMember['user_id'] == null) {
          throw Exception('Selected member not found or has no user account');
        }

        await dataSource.client.from('notifications').insert({
          'organization_id': organizationId,
          'sender_id': user.id,
          'recipient_id': selectedMember['user_id'],
          'member_id': selectedMember['id'],
          'title': _titleController.text.trim(),
          'message': _messageController.text.trim(),
          'type': 'info',
        });

        sentCount = 1;
        setState(() {
          _success = 'Message sent successfully to ${selectedMember['full_name']}! They will see it in their notifications.';
        });
      }

      // Reset form
      _titleController.clear();
      _messageController.clear();
      _selectedMemberId = null;
      _recipientType = 'all';
      setState(() => _showForm = false);

      // Refresh messages
      ref.invalidate(adminMessagesProvider);

      // Clear success message after 5 seconds
      Future.delayed(const Duration(seconds: 5), () {
        if (mounted) {
          setState(() => _success = null);
        }
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(adminMessagesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        actions: [
          IconButton(
            icon: Icon(_showForm ? Icons.close : Icons.send),
            tooltip: _showForm ? 'Close Form' : 'Send Message',
            onPressed: () {
              setState(() {
                _showForm = !_showForm;
                if (!_showForm) {
                  _titleController.clear();
                  _messageController.clear();
                  _selectedMemberId = null;
                  _recipientType = 'all';
                  _error = null;
                  _success = null;
                }
              });
            },
          ),
        ],
      ),
      body: messagesAsync.when(
        data: (data) {
          if (data == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final members = data['members'] as List<Map<String, dynamic>>;
          final messages = data['messages'] as List<Map<String, dynamic>>;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Message Form
                if (_showForm) ...[
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Send Message',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 16),
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
                                style: TextStyle(color: Colors.red.shade800),
                              ),
                            ),
                          if (_success != null)
                            Container(
                              padding: const EdgeInsets.all(12),
                              margin: const EdgeInsets.only(bottom: 16),
                              decoration: BoxDecoration(
                                color: Colors.green.shade50,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.green.shade200),
                              ),
                              child: Text(
                                _success!,
                                style: TextStyle(color: Colors.green.shade800),
                              ),
                            ),
                          // Recipient Type
                          Text(
                            'Send To',
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: RadioListTile<String>(
                                  title: const Text('All Members'),
                                  value: 'all',
                                  groupValue: _recipientType,
                                  onChanged: (value) {
                                    setState(() {
                                      _recipientType = value!;
                                      _selectedMemberId = null;
                                    });
                                  },
                                  contentPadding: EdgeInsets.zero,
                                ),
                              ),
                              Expanded(
                                child: RadioListTile<String>(
                                  title: const Text('Individual'),
                                  value: 'individual',
                                  groupValue: _recipientType,
                                  onChanged: (value) {
                                    setState(() => _recipientType = value!);
                                  },
                                  contentPadding: EdgeInsets.zero,
                                ),
                              ),
                            ],
                          ),
                          // Member Selection
                          if (_recipientType == 'individual') ...[
                            const SizedBox(height: 8),
                            DropdownButtonFormField<String>(
                              decoration: const InputDecoration(
                                labelText: 'Select Member *',
                                border: OutlineInputBorder(),
                              ),
                              value: _selectedMemberId,
                              items: members.map((member) {
                                return DropdownMenuItem<String>(
                                  value: member['id'],
                                  child: Text(
                                    '${member['full_name']} (${member['membership_id']})',
                                  ),
                                );
                              }).toList(),
                              onChanged: (value) {
                                setState(() => _selectedMemberId = value);
                              },
                            ),
                          ],
                          const SizedBox(height: 16),
                          // Title
                          TextField(
                            controller: _titleController,
                            decoration: const InputDecoration(
                              labelText: 'Subject *',
                              border: OutlineInputBorder(),
                              hintText: 'Enter message subject',
                            ),
                          ),
                          const SizedBox(height: 16),
                          // Message
                          TextField(
                            controller: _messageController,
                            decoration: const InputDecoration(
                              labelText: 'Message *',
                              border: OutlineInputBorder(),
                              hintText: 'Enter your message',
                            ),
                            maxLines: 6,
                          ),
                          const SizedBox(height: 16),
                          // Buttons
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: _isLoading ? null : _sendMessage,
                                  child: _isLoading
                                      ? const SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: CircularProgressIndicator(strokeWidth: 2),
                                        )
                                      : const Text('Send Message'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: _isLoading
                                      ? null
                                      : () {
                                          setState(() {
                                            _showForm = false;
                                            _titleController.clear();
                                            _messageController.clear();
                                            _selectedMemberId = null;
                                            _recipientType = 'all';
                                            _error = null;
                                            _success = null;
                                          });
                                        },
                                  child: const Text('Cancel'),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
                // Sent Messages
                Text(
                  'Sent Messages',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                if (messages.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Center(
                        child: Text(
                          'No messages sent yet',
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(color: Colors.grey[600]),
                        ),
                      ),
                    ),
                  )
                else
                  ...messages.map((msg) {
                    final recipient = msg['recipient'] as Map<String, dynamic>?;
                    final isRead = msg['is_read'] ?? false;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      color: isRead ? null : Colors.blue.shade50,
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(16),
                        leading: Icon(
                          Icons.message_outlined,
                          color: isRead ? Colors.grey : Colors.blue,
                        ),
                        title: Text(
                          msg['title'] ?? 'Notification',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            Text(msg['message'] ?? ''),
                            if (recipient != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                'To: ${recipient['full_name']} (${recipient['email']})',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: Colors.grey[600],
                                    ),
                              ),
                            ],
                            const SizedBox(height: 4),
                            Text(
                              DateFormat('MMM dd, yyyy HH:mm').format(
                                DateTime.parse(
                                  msg['created_at'] ?? DateTime.now().toIso8601String(),
                                ),
                              ),
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.grey[500],
                                    fontSize: 12,
                                  ),
                            ),
                          ],
                        ),
                        trailing: !isRead
                            ? Chip(
                                label: const Text('Unread', style: TextStyle(fontSize: 11)),
                                backgroundColor: Colors.blue.shade100,
                                labelStyle: TextStyle(color: Colors.blue.shade800),
                              )
                            : null,
                      ),
                    );
                  }).toList(),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                const SizedBox(height: 16),
                Text(
                  'Error Loading Messages',
                  style: Theme.of(context).textTheme.headlineSmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  error.toString(),
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    ref.invalidate(adminMessagesProvider);
                  },
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


