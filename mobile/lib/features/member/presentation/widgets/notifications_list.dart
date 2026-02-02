import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/member_provider.dart';

class NotificationsList extends ConsumerStatefulWidget {
  final List<Map<String, dynamic>> notifications;

  const NotificationsList({super.key, required this.notifications});

  @override
  ConsumerState<NotificationsList> createState() => _NotificationsListState();
}

class _NotificationsListState extends ConsumerState<NotificationsList> {
  String? _deletingNotificationId;

  Future<void> _handleDeleteNotification(String notificationId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Notification'),
        content:
            const Text('Are you sure you want to delete this notification?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _deletingNotificationId = notificationId);
    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      await dataSource.deleteNotification(notificationId);
      ref.invalidate(memberNotificationsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Notification deleted'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error deleting notification: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _deletingNotificationId = null);
      }
    }
  }

  Future<void> _handleMarkAsRead(String notificationId) async {
    try {
      final dataSource = ref.read(supabaseDataSourceProvider);
      await dataSource.markNotificationAsRead(notificationId);
      ref.invalidate(memberNotificationsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content:
                Text('Error marking notification as read: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final notifications = widget.notifications;
    if (notifications.isEmpty) {
      return Card(
        elevation: 2,
        shadowColor: Theme.of(context).colorScheme.primary.withOpacity(0.1),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(
            color: Theme.of(context).colorScheme.primary.withOpacity(0.15),
            width: 1.5,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.notifications_none_rounded,
                size: 48,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.3),
              ),
              const SizedBox(height: 16),
              Text(
                'No notifications',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.6),
                    ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: notifications.length,
      itemBuilder: (context, index) {
        final notification = notifications[index];
        final isRead = notification['is_read'] ?? false;

        final theme = Theme.of(context);
        final notificationColor = isRead
            ? theme.colorScheme.primary.withOpacity(0.1)
            : theme.colorScheme.primary;

        return Card(
          elevation: isRead ? 1 : 2,
          shadowColor: notificationColor.withOpacity(0.15),
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            side: BorderSide(
              color: isRead
                  ? theme.colorScheme.primary.withOpacity(0.1)
                  : notificationColor.withOpacity(0.3),
              width: isRead ? 1.5 : 2,
            ),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: isRead
                  ? null
                  : LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        notificationColor.withOpacity(0.08),
                        notificationColor.withOpacity(0.03),
                      ],
                    ),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  gradient: isRead
                      ? null
                      : LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            notificationColor,
                            notificationColor.withOpacity(0.7),
                          ],
                        ),
                  color: isRead
                      ? theme.colorScheme.primary.withOpacity(0.1)
                      : null,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: isRead
                      ? null
                      : [
                          BoxShadow(
                            color: notificationColor.withOpacity(0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                ),
                child: Icon(
                  Icons.notifications_rounded,
                  color: isRead ? theme.colorScheme.primary : Colors.white,
                  size: 28,
                ),
              ),
              title: Text(
                notification['title'] ?? 'Notification',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: isRead ? FontWeight.w600 : FontWeight.bold,
                  color: theme.colorScheme.onSurface,
                  letterSpacing: -0.2,
                ),
              ),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      notification['message'] ?? '',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurface.withOpacity(0.7),
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(
                          Icons.access_time_rounded,
                          size: 12,
                          color: theme.colorScheme.onSurface.withOpacity(0.5),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          DateFormat('MMM dd, yyyy HH:mm').format(
                            DateTime.parse(notification['created_at'] ??
                                DateTime.now().toIso8601String()),
                          ),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface.withOpacity(0.5),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (!isRead)
                    Container(
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: IconButton(
                        icon: Icon(
                          Icons.check_circle_outline_rounded,
                          size: 20,
                          color: theme.colorScheme.primary,
                        ),
                        tooltip: 'Mark as read',
                        onPressed: () => _handleMarkAsRead(notification['id']),
                      ),
                    ),
                  const SizedBox(width: 4),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: IconButton(
                      icon: _deletingNotificationId == notification['id']
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor:
                                    AlwaysStoppedAnimation<Color>(Colors.red),
                              ),
                            )
                          : const Icon(
                              Icons.delete_outline_rounded,
                              size: 20,
                              color: Colors.red,
                            ),
                      tooltip: 'Delete',
                      onPressed: _deletingNotificationId == notification['id']
                          ? null
                          : () => _handleDeleteNotification(notification['id']),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
