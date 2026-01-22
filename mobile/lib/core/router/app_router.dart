import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/profile_page.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/member/presentation/pages/member_dashboard_page.dart';
import '../../features/member/presentation/pages/member_register_page.dart';
import '../../features/admin/presentation/pages/admin_dashboard_page.dart';
import '../../features/admin/presentation/pages/members_management_page.dart';
import '../../features/admin/presentation/pages/payment_management_page.dart';
import '../../features/admin/presentation/pages/messages_management_page.dart';
import '../../features/admin/presentation/pages/organization_settings_page.dart';
import '../../features/super_admin/presentation/pages/super_admin_dashboard_page.dart';
import '../../features/super_admin/presentation/pages/super_admin_register_page.dart';
import '../../features/organization/presentation/pages/organization_register_page.dart';
import '../../core/data/datasources/supabase_datasource.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);
  final dataSource = ref.read(supabaseDataSourceProvider);
  
  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) async {
      final isLoggedIn = authState.value != null;
      final location = state.matchedLocation;
      final publicRoutes = ['/login', '/register', '/member-register', '/super-admin-register'];
      final isPublicRoute = publicRoutes.contains(location);
      
      // Redirect to login if not logged in and trying to access protected route
      if (!isLoggedIn && !isPublicRoute) {
        return '/login';
      }
      
      // If logged in and on public auth pages, redirect to appropriate dashboard
      if (isLoggedIn && (location == '/login' || location == '/register' || 
                         location == '/member-register' || location == '/super-admin-register')) {
        final user = authState.value;
        if (user != null) {
          try {
            final userProfile = await dataSource.getUserProfile(user.id);
            final role = userProfile?['role'];
            
            if (role == 'super_admin') {
              return '/super-admin';
            } else if (role == 'org_admin') {
              return '/admin';
            } else if (role == 'member') {
              return '/member';
            }
          } catch (e) {
            return '/login';
          }
        }
      }
      
      // Redirect root path to login
      if (location == '/') {
        if (isLoggedIn) {
          final user = authState.value;
          if (user != null) {
            try {
              final userProfile = await dataSource.getUserProfile(user.id);
              final role = userProfile?['role'];
              
              if (role == 'super_admin') {
                return '/super-admin';
              } else if (role == 'org_admin') {
                return '/admin';
              } else if (role == 'member') {
                return '/member';
              }
            } catch (e) {
              return '/login';
            }
          }
        }
        return '/login';
      }
      
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const OrganizationRegisterPage(),
      ),
      GoRoute(
        path: '/member-register',
        builder: (context, state) => const MemberRegisterPage(),
      ),
      GoRoute(
        path: '/super-admin-register',
        builder: (context, state) => const SuperAdminRegisterPage(),
      ),
      GoRoute(
        path: '/member',
        builder: (context, state) => const MemberDashboardPage(),
      ),
      GoRoute(
        path: '/admin',
        builder: (context, state) => const AdminDashboardPage(),
      ),
      GoRoute(
        path: '/admin/members',
        builder: (context, state) => const MembersManagementPage(),
      ),
      GoRoute(
        path: '/admin/payments',
        builder: (context, state) => const PaymentManagementPage(),
      ),
      GoRoute(
        path: '/admin/messages',
        builder: (context, state) => const MessagesManagementPage(),
      ),
      GoRoute(
        path: '/admin/settings',
        builder: (context, state) => const OrganizationSettingsPage(),
      ),
      GoRoute(
        path: '/super-admin',
        builder: (context, state) => const SuperAdminDashboardPage(),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfilePage(),
      ),
    ],
  );
});

final authStateProvider = StreamProvider<User?>((ref) {
  return Supabase.instance.client.auth.onAuthStateChange.map((event) => event.session?.user);
});

