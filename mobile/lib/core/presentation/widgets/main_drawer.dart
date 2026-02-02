import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../features/auth/presentation/providers/auth_provider.dart';

class MainDrawer extends ConsumerWidget {
  final String role;
  final String? organizationName;

  const MainDrawer({
    super.key,
    required this.role,
    this.organizationName,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Drawer(
      child: Column(
        children: [
          _buildHeader(context, theme),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: _buildMenuItems(context),
            ),
          ),
          const Divider(height: 1),
          _buildSignOutButton(context, ref),
          SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, ThemeData theme) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
          24, MediaQuery.of(context).padding.top + 24, 24, 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            theme.colorScheme.primary,
            theme.colorScheme.primary.withRed(30).withGreen(60).withBlue(160),
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(13),
              child: Container(
                width: 50,
                height: 50,
                color: Colors.white,
                child: Center(
                  child: Text(
                    (organizationName ?? 'K').substring(0, 1).toUpperCase(),
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            organizationName ?? 'KnsPaymentRail',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          Text(
            _getRoleDisplayName(),
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  String _getRoleDisplayName() {
    switch (role) {
      case 'super_admin':
        return 'Global Administrator';
      case 'org_admin':
        return 'Organization Admin';
      case 'member':
        return 'Member Portal';
      default:
        return 'User';
    }
  }

  List<Widget> _buildMenuItems(BuildContext context) {
    List<Widget> items = [];

    // Common Item: Dashboard
    items.add(_buildMenuItem(
      context,
      icon: Icons.dashboard_rounded,
      title: 'Dashboard',
      onTap: () => _navigateTo(
          context,
          role == 'org_admin'
              ? '/admin'
              : (role == 'super_admin' ? '/super-admin' : '/member')),
    ));

    if (role == 'org_admin') {
      items.addAll([
        _buildMenuItem(
          context,
          icon: Icons.people_rounded,
          title: 'Members',
          onTap: () => _navigateTo(context, '/admin/members'),
        ),
        _buildMenuItem(
          context,
          icon: Icons.payments_rounded,
          title: 'Payments',
          onTap: () => _navigateTo(context, '/admin/payments'),
        ),
        _buildMenuItem(
          context,
          icon: Icons.tab_rounded,
          title: 'Payment Tabs',
          onTap: () => _navigateTo(context, '/admin/payment-tabs'),
        ),
        _buildMenuItem(
          context,
          icon: Icons.analytics_rounded,
          title: 'Reports',
          onTap: () => _navigateTo(context, '/admin/reports'),
        ),
        _buildMenuItem(
          context,
          icon: Icons.message_rounded,
          title: 'Messages',
          onTap: () => _navigateTo(context, '/admin/messages'),
        ),
        _buildMenuItem(
          context,
          icon: Icons.settings_rounded,
          title: 'Organization Settings',
          onTap: () => _navigateTo(context, '/admin/settings'),
        ),
      ]);
    } else if (role == 'member') {
      items.addAll([
        _buildMenuItem(
          context,
          icon: Icons.receipt_long_rounded,
          title: 'Receipts',
          onTap: () => _navigateTo(context, '/member/receipts'),
        ),
        _buildMenuItem(
          context,
          icon: Icons.history_rounded,
          title: 'Payment History',
          onTap: () => _navigateTo(context, '/member/history'),
        ),
        _buildMenuItem(
          context,
          icon: Icons.add_card_rounded,
          title: 'Payments',
          onTap: () => _navigateTo(context, '/member/pay'),
        ),
      ]);
    } else if (role == 'super_admin') {
      items.addAll([
        _buildMenuItem(
          context,
          icon: Icons.business_rounded,
          title: 'Organizations',
          onTap: () => _navigateTo(context, '/super-admin'),
        ),
      ]);
    }

    // Common Item: Profile
    items.add(_buildMenuItem(
      context,
      icon: Icons.person_rounded,
      title: 'My Profile',
      onTap: () => _navigateTo(context, '/profile'),
    ));

    return items;
  }

  void _navigateTo(BuildContext context, String path) {
    context.pop(); // Close drawer
    context.go(path);
  }

  Widget _buildMenuItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: Colors.blueGrey.shade600, size: 22),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Color(0xFF1E293B),
        ),
      ),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    );
  }

  Widget _buildSignOutButton(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: () async {
          context.pop();
          await ref.read(authProvider.notifier).signOut();
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.red.shade50,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(Icons.logout_rounded, color: Colors.red.shade600, size: 20),
              const SizedBox(width: 12),
              Text(
                'Sign Out',
                style: TextStyle(
                  color: Colors.red.shade700,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
