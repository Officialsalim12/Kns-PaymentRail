import 'package:flutter/foundation.dart';
import 'dart:io';

class AppConfig {
  static const String supabaseUrl = 'https://dcnxszcexngyghbelbrk.supabase.co';
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbnhzemNleG5neWdoYmVsYnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NjIwOTUsImV4cCI6MjA4MTQzODA5NX0.o3BgfChIpd5T9JiCY9sWEF6hdjMjGiQdiX3JNGdRVLA';

  static String get webAppUrl {
    if (!kIsWeb && Platform.isAndroid) {
      // Use 10.0.2.2 for Android emulators to access host localhost
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  static const String appName = 'KnsPaymentRail';
  static const String appVersion = '1.0.0';
}
