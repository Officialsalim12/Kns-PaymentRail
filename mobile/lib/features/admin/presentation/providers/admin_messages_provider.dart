import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

final adminMessagesProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final authAsync = ref.watch(authProvider);
  final dataSource = ref.read(supabaseDataSourceProvider);

  return authAsync.when(
    data: (user) async {
      if (user == null) {
        return {
          'members': <Map<String, dynamic>>[],
          'messages': <Map<String, dynamic>>[],
        };
      }

      try {
        final userProfile = await dataSource.getUserProfile(user.id);
        if (userProfile == null || userProfile['organization_id'] == null) {
          return {
            'members': <Map<String, dynamic>>[],
            'messages': <Map<String, dynamic>>[],
          };
        }

        final organizationId = userProfile['organization_id'];

        // Get active members for messaging
        final members = await dataSource.getActiveMembersForMessaging(organizationId).catchError((error) {
          // Return empty list on error
          return <Map<String, dynamic>>[];
        });

        // Get messages sent by this admin
        final messages = await dataSource.getMessagesSentByAdmin(organizationId, user.id).catchError((error) {
          // Return empty list on error
          return <Map<String, dynamic>>[];
        });

        return {
          'members': members,
          'messages': messages,
        };
      } catch (e) {
        // Return empty data structure on any error
        return {
          'members': <Map<String, dynamic>>[],
          'messages': <Map<String, dynamic>>[],
        };
      }
    },
    loading: () => null,
    error: (_, __) => {
      'members': <Map<String, dynamic>>[],
      'messages': <Map<String, dynamic>>[],
    },
  );
});



