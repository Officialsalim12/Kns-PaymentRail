import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/admin_provider.dart';
import '../../../../core/utils/currency_formatter.dart';

class AdminReportsPage extends ConsumerWidget {
  const AdminReportsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(adminDashboardProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Organization Reports',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: const Color(0xFF0F172A),
      ),
      body: dashboardAsync.when(
        data: (dashboard) {
          if (dashboard == null)
            return const Center(child: CircularProgressIndicator());

          final stats = dashboard['stats'];
          final totalPayments = stats['totalPayments'] ?? 0.0;
          final totalMembers = stats['totalMembers'] ?? 0;
          final activeMembers = stats['activeMembers'] ?? 0;

          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              _buildReportCard(
                context,
                'Financial Summary',
                'Total Revenue Collected',
                CurrencyFormatter.format(totalPayments.toDouble()),
                Icons.analytics_rounded,
                Colors.blue,
              ),
              const SizedBox(height: 20),
              _buildReportCard(
                context,
                'Membership Overview',
                'Total Registered Members',
                totalMembers.toString(),
                Icons.people_alt_rounded,
                Colors.green,
              ),
              const SizedBox(height: 20),
              _buildReportCard(
                context,
                'Engagement',
                'Active Participating Members',
                activeMembers.toString(),
                Icons.stars_rounded,
                Colors.orange,
              ),
              const SizedBox(height: 32),
              const Text(
                'More detailed reports will be available soon.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.blueGrey, fontSize: 13),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildReportCard(
    BuildContext context,
    String category,
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: color.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    category.toUpperCase(),
                    style: TextStyle(
                      color: color,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                    ),
                  ),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            value,
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w900,
              letterSpacing: -1,
              color: Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }
}
