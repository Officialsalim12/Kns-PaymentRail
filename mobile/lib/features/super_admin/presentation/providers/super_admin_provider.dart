import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

final superAdminDashboardProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final dataSource = ref.read(supabaseDataSourceProvider);

  // Get all organizations
  final organizations = await dataSource.getOrganizations();

  // Get platform stats
  final allUsers = await dataSource.getAllUsers();
  final allPayments = await dataSource.getAllPayments();

  final totalPayments = allPayments.fold<double>(
    0,
    (sum, payment) => sum + ((payment['amount'] ?? 0) as num).toDouble(),
  );

  final stats = {
    'totalOrganizations': organizations.length,
    'pendingApprovals': organizations.where((o) => o['status'] == 'pending').length,
    'totalUsers': allUsers.length,
    'totalPayments': totalPayments,
  };

  return {
    'organizations': organizations,
    'stats': stats,
  };
});


