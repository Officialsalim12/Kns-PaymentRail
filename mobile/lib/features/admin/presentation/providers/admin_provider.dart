import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

final adminDashboardProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final authAsync = ref.watch(authProvider);
  final dataSource = ref.read(supabaseDataSourceProvider);

  return authAsync.when(
    data: (user) async {
      if (user == null) return null;

      final userProfile = await dataSource.getUserProfile(user.id);
      if (userProfile == null || userProfile['organization_id'] == null) {
        return null;
      }

      final organizationId = userProfile['organization_id'];
      final organization = await dataSource.getOrganization(organizationId);
      final orgData = organization != null
          ? {
              'id': organization['id'],
              'name': organization['name'],
              'logo_url': organization['logo_url'],
            }
          : null;

      final members = await dataSource.getMembers(organizationId);
      final activeMembers = members.where((m) => m['status'] == 'active').length;
      final completedPayments = await dataSource.getPaymentsByStatus(organizationId, 'completed');
      final totalPayments = completedPayments.fold<double>(
        0,
        (sum, payment) => sum + ((payment['amount'] ?? 0) as num).toDouble(),
      );

      // Only show completed payments in the payment record
      final recentPayments = completedPayments.take(10).toList();
      final pendingMembers = members
          .where((m) => m['status'] == 'pending')
          .take(10)
          .toList();

      return {
        'organization': orgData,
        'stats': {
          'totalMembers': members.length,
          'activeMembers': activeMembers,
          'totalPayments': totalPayments,
        },
        'recentPayments': recentPayments,
        'pendingMembers': pendingMembers,
      };
    },
    loading: () => null,
    error: (_, __) => null,
  );
});

final adminMembersProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final authAsync = ref.watch(authProvider);
  final dataSource = ref.read(supabaseDataSourceProvider);

  return authAsync.when(
    data: (user) async {
      if (user == null) return [];

      final userProfile = await dataSource.getUserProfile(user.id);
      if (userProfile == null || userProfile['organization_id'] == null) {
        return [];
      }

      final organizationId = userProfile['organization_id'];
      return await dataSource.getMembers(organizationId);
    },
    loading: () => [],
    error: (_, __) => [],
  );
});

final adminPaymentsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final authAsync = ref.watch(authProvider);
  final dataSource = ref.read(supabaseDataSourceProvider);

  return authAsync.when(
    data: (user) async {
      if (user == null) return [];

      final userProfile = await dataSource.getUserProfile(user.id);
      if (userProfile == null || userProfile['organization_id'] == null) {
        return [];
      }

      final organizationId = userProfile['organization_id'];
      return await dataSource.getPayments(organizationId);
    },
    loading: () => [],
    error: (_, __) => [],
  );
});

final adminActiveMembersProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final authAsync = ref.watch(authProvider);
  final dataSource = ref.read(supabaseDataSourceProvider);

  return authAsync.when(
    data: (user) async {
      if (user == null) return [];

      final userProfile = await dataSource.getUserProfile(user.id);
      if (userProfile == null || userProfile['organization_id'] == null) {
        return [];
      }

      final organizationId = userProfile['organization_id'];
      final members = await dataSource.getMembers(organizationId);
      return members.where((m) => m['status'] == 'active').toList();
    },
    loading: () => [],
    error: (_, __) => [],
  );
});

