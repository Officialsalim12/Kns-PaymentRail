import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseDataSource {
  final SupabaseClient _client = Supabase.instance.client;

  SupabaseClient get client => _client;

  Future<AuthResponse> signIn(String email, String password) async {
    try {
      final response = await _client.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (response.user == null) {
        throw Exception('Login failed: No user returned from authentication');
      }

      return response;
    } catch (e) {
      rethrow;
    }
  }

  Future<AuthResponse> signUp(String email, String password, {String? fullName}) {
    return _client.auth.signUp(
      email: email,
      password: password,
      data: fullName != null ? {'full_name': fullName} : null,
    );
  }

  Future<void> signOut() {
    return _client.auth.signOut();
  }

  User? get currentUser => _client.auth.currentUser;

  Future<List<Map<String, dynamic>>> getOrganizations({String? status}) {
    var query = _client.from('organizations').select();
    
    if (status != null) {
      query = query.eq('status', status);
    }
    
    return query.order('created_at', ascending: false);
  }

  Future<Map<String, dynamic>?> getOrganization(String id) {
    return _client
        .from('organizations')
        .select()
        .eq('id', id)
        .single();
  }

  Future<Map<String, dynamic>> createOrganization(Map<String, dynamic> data) {
    return _client
        .from('organizations')
        .insert(data)
        .select()
        .single();
  }

  Future<void> updateOrganization(String id, Map<String, dynamic> data) {
    return _client
        .from('organizations')
        .update(data)
        .eq('id', id);
  }

  Future<void> deleteOrganization(String id) {
    return _client
        .from('organizations')
        .delete()
        .eq('id', id);
  }

  Future<Map<String, dynamic>?> getUserProfile(String userId) {
    return _client
        .from('users')
        .select('*, organization:organizations(*)')
        .eq('id', userId)
        .maybeSingle();
  }

  Future<void> createUserProfile(Map<String, dynamic> data) async {
    const maxRetries = 8;
    const retryDelay = Duration(milliseconds: 400);
    
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      if (attempt > 1) {
        await Future.delayed(retryDelay);
      }
      
      try {
        // Try RPC function first if it exists
        try {
          await _client.rpc('create_user_profile', params: {
            'p_user_id': data['id'],
            'p_email': data['email'],
            'p_full_name': data['full_name'],
            'p_role': data['role'],
            'p_organization_id': data['organization_id'],
            'p_phone_number': data['phone_number'],
          });
          return; // Success
        } catch (rpcError) {
          // If RPC doesn't exist or fails, fall through to direct insert
        }
        
        // Direct insert with retry logic
        final response = await _client.from('users').insert({
          'id': data['id'],
          'email': data['email'],
          'full_name': data['full_name'],
          'role': data['role'],
          'organization_id': data['organization_id'],
          'phone_number': data['phone_number'],
        }).select();
        
        if (response.isNotEmpty) {
          return; // Success
        }
      } catch (e) {
        final errorString = e.toString();
        
        // If duplicate key error (user already exists), consider it success
        if (errorString.contains('23505') || errorString.contains('duplicate')) {
          return;
        }
        
        // If foreign key constraint error, retry (user might not be confirmed yet)
        if (errorString.contains('23503') || errorString.contains('foreign key')) {
          if (attempt == maxRetries) {
            throw Exception('Failed to create user profile after $maxRetries attempts. User may not be confirmed in auth system.');
          }
          continue; // Retry
        }
        
        // For other errors, throw immediately
        if (attempt == maxRetries) {
          throw Exception('Failed to create user profile: $errorString');
        }
      }
    }
    
    throw Exception('Failed to create user profile after $maxRetries attempts');
  }

  Future<Map<String, dynamic>?> getMemberByUserId(String userId) {
    return _client
        .from('members')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
  }

  Future<Map<String, dynamic>> createMember(Map<String, dynamic> data) {
    return _client
        .from('members')
        .insert(data)
        .select()
        .single();
  }

  Future<List<Map<String, dynamic>>> getMembers(String organizationId) {
    return _client
        .from('members')
        .select()
        .eq('organization_id', organizationId)
        .order('created_at', ascending: false);
  }

  Future<List<Map<String, dynamic>>> getActiveMembersForMessaging(String organizationId) {
    // Include both active and pending members for consistency across all organizations
    // Note: Still requires user_id to be set (members must have accounts)
    return _client
        .from('members')
        .select('id, full_name, membership_id, email, user_id, status')
        .eq('organization_id', organizationId)
        .inFilter('status', ['active', 'pending'])
        .not('user_id', 'is', null)
        .order('full_name');
  }

  Future<void> updateMemberStatus(String memberId, String status, {double? unpaidBalance}) {
    final updateData = <String, dynamic>{'status': status};
    if (unpaidBalance != null) {
      updateData['unpaid_balance'] = unpaidBalance;
    }
    return _client
        .from('members')
        .update(updateData)
        .eq('id', memberId);
  }

  Future<void> updateMember(String memberId, Map<String, dynamic> data) {
    return _client
        .from('members')
        .update(data)
        .eq('id', memberId);
  }

  Future<void> deletePayment(String paymentId) {
    return _client
        .from('payments')
        .delete()
        .eq('id', paymentId);
  }

  Future<void> deleteReceipt(String paymentId) {
    return _client
        .from('receipts')
        .delete()
        .eq('payment_id', paymentId);
  }

  Future<void> deleteReceiptGenerationLogs(String paymentId) {
    return _client
        .from('receipt_generation_logs')
        .delete()
        .eq('payment_id', paymentId);
  }

  Future<List<Map<String, dynamic>>> getPayments(String organizationId, {String? memberId}) {
    var query = _client
        .from('payments')
        .select('*, member:members(full_name, membership_id), receipt:receipts(receipt_number, pdf_url)')
        .eq('organization_id', organizationId)
        .eq('payment_status', 'completed'); // Only return completed payments
    
    if (memberId != null) {
      query = query.eq('member_id', memberId);
    }
    
    return query.order('created_at', ascending: false);
  }

  Future<List<Map<String, dynamic>>> getPaymentsByStatus(String organizationId, String status) {
    return _client
        .from('payments')
        .select('amount')
        .eq('organization_id', organizationId)
        .eq('payment_status', status)
        .order('created_at', ascending: false);
  }

  Future<Map<String, dynamic>> createPayment(Map<String, dynamic> data) {
    return _client
        .from('payments')
        .insert(data)
        .select()
        .single();
  }

  Future<List<Map<String, dynamic>>> getReceipts(String memberId) {
    return _client
        .from('receipts')
        .select('*, payment:payments(*)')
        .eq('member_id', memberId)
        .order('created_at', ascending: false);
  }

  Future<List<Map<String, dynamic>>> getNotifications(String userId) {
    return _client
        .from('notifications')
        .select()
        .eq('recipient_id', userId)
        .order('created_at', ascending: false);
  }

  Future<void> markNotificationAsRead(String notificationId) {
    return _client
        .from('notifications')
        .update({
          'is_read': true,
          'read_at': DateTime.now().toIso8601String(),
        })
        .eq('id', notificationId);
  }

  Future<void> deleteNotification(String notificationId) {
    return _client
        .from('notifications')
        .delete()
        .eq('id', notificationId);
  }

  Future<List<Map<String, dynamic>>> getMessagesSentByAdmin(String organizationId, String senderId) {
    return _client
        .from('notifications')
        .select('*, recipient:users(full_name, email)')
        .eq('organization_id', organizationId)
        .eq('sender_id', senderId)
        .order('created_at', ascending: false);
  }

  Future<Map<String, dynamic>> generateReceipt({
    required String paymentId,
    required String organizationId,
    required String memberId,
  }) async {
    final response = await _client.functions.invoke(
      'generate-receipt',
      body: {
        'paymentId': paymentId,
        'organizationId': organizationId,
        'memberId': memberId,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> sendNotification({
    required String organizationId,
    required String recipientId,
    required String title,
    required String message,
    String? memberId,
    String type = 'info',
  }) async {
    final response = await _client.functions.invoke(
      'send-notification',
      body: {
        'organizationId': organizationId,
        'recipientId': recipientId,
        'title': title,
        'message': message,
        'memberId': memberId,
        'type': type,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> getAllUsers() {
    return _client
        .from('users')
        .select('id, role')
        .order('created_at', ascending: false);
  }

  Future<List<Map<String, dynamic>>> getAllPayments() {
    return _client
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .order('created_at', ascending: false);
  }

  Future<List<Map<String, dynamic>>> getMemberTabs(String memberId) {
    return _client
        .from('member_tabs')
        .select()
        .eq('member_id', memberId)
        .eq('is_active', true)
        .order('created_at', ascending: false);
  }

  Future<List<Map<String, dynamic>>> getMemberTabsForAdmin(String memberId) {
    return _client
        .from('member_tabs')
        .select()
        .eq('member_id', memberId)
        .order('created_at', ascending: false);
  }

  Future<Map<String, dynamic>> createMemberTab(Map<String, dynamic> data) {
    return _client
        .from('member_tabs')
        .insert(data)
        .select()
        .single();
  }

  Future<void> updateMemberTab(String tabId, Map<String, dynamic> data) {
    return _client
        .from('member_tabs')
        .update(data)
        .eq('id', tabId);
  }

  Future<void> deleteMemberTab(String tabId) {
    return _client
        .from('member_tabs')
        .delete()
        .eq('id', tabId);
  }
}

