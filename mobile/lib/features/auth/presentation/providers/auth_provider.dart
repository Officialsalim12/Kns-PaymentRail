import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';

final supabaseDataSourceProvider = Provider<SupabaseDataSource>((ref) {
  return SupabaseDataSource();
});

final authProvider = StateNotifierProvider<AuthNotifier, AsyncValue<User?>>((ref) {
  return AuthNotifier(ref.read(supabaseDataSourceProvider));
});

class AuthNotifier extends StateNotifier<AsyncValue<User?>> {
  final SupabaseDataSource _dataSource;

  AuthNotifier(this._dataSource) : super(const AsyncValue.loading()) {
    _init();
  }

  void _init() {
    final user = _dataSource.currentUser;
    state = AsyncValue.data(user);
  }

  Future<void> signIn(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      final response = await _dataSource.signIn(email, password);
      state = AsyncValue.data(response.user);
    } catch (e, stackTrace) {
      state = AsyncValue.error(e, stackTrace);
      rethrow;
    }
  }

  Future<AuthResponse> signUp(String email, String password, {String? fullName}) async {
    state = const AsyncValue.loading();
    try {
      final response = await _dataSource.signUp(
        email,
        password,
        fullName: fullName,
      );
      state = AsyncValue.data(response.user);
      return response;
    } catch (e, stackTrace) {
      state = AsyncValue.error(e, stackTrace);
      rethrow;
    }
  }

  Future<void> signOut() async {
    await _dataSource.signOut();
    state = const AsyncValue.data(null);
  }
}

