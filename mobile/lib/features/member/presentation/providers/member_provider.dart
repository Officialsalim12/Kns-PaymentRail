import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

final memberProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final authAsync = ref.watch(authProvider);
  final dataSource = ref.read(supabaseDataSourceProvider);
  
  return authAsync.when(
    data: (user) async {
      if (user == null) return null;
      return await dataSource.getMemberByUserId(user.id);
    },
    loading: () => null,
    error: (_, __) => null,
  );
});

final memberPaymentsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final memberAsync = await ref.watch(memberProvider.future);
  final dataSource = ref.read(supabaseDataSourceProvider);
  
  if (memberAsync == null) return [];
  
  final organizationId = memberAsync['organization_id'];
  final memberId = memberAsync['id'];
  final payments = await dataSource.getPayments(organizationId, memberId: memberId);
  return payments;
});

final memberNotificationsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final authAsync = ref.watch(authProvider);
  final dataSource = ref.read(supabaseDataSourceProvider);
  
  return authAsync.when(
    data: (user) async {
      if (user == null) return [];
      final notifications = await dataSource.getNotifications(user.id);
      return notifications.take(10).toList();
    },
    loading: () => [],
    error: (_, __) => [],
  );
});

final memberTabsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final memberAsync = await ref.watch(memberProvider.future);
  final dataSource = ref.read(supabaseDataSourceProvider);
  
  if (memberAsync == null) return [];
  
  final memberId = memberAsync['id'];
  return await dataSource.getMemberTabs(memberId);
});

