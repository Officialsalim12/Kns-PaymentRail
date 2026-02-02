import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/data/datasources/supabase_datasource.dart';

final supabaseDataSourceProvider = Provider<SupabaseDataSource>((ref) {
  return SupabaseDataSource();
});

final authProvider =
    StateNotifierProvider<AuthNotifier, AsyncValue<User?>>((ref) {
  return AuthNotifier(ref.read(supabaseDataSourceProvider));
});

class AuthNotifier extends StateNotifier<AsyncValue<User?>> {
  final SupabaseDataSource _dataSource;
  late final StreamSubscription<AuthState> _authSubscription;

  AuthNotifier(this._dataSource) : super(const AsyncValue.loading()) {
    _init();
  }

  void _init() {
    // Set initial user
    final user = _dataSource.currentUser;
    state = AsyncValue.data(user);

    // Listen to auth state changes
    _authSubscription =
        _dataSource.client.auth.onAuthStateChange.listen((data) {
      final AuthChangeEvent event = data.event;
      final Session? session = data.session;

      if (event == AuthChangeEvent.signedIn) {
        state = AsyncValue.data(session?.user);
      } else if (event == AuthChangeEvent.signedOut) {
        state = const AsyncValue.data(null);
      } else if (event == AuthChangeEvent.userUpdated) {
        state = AsyncValue.data(session?.user);
      }
      // Handle other events if necessary
    });
  }

  Future<void> signIn(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      await _dataSource.signIn(email, password);
      // State update is handled by the listener, but we can set it here optimistically or wait
      // The listener is usually fast enough.
    } catch (e, stackTrace) {
      state = AsyncValue.error(e, stackTrace);
      rethrow;
    }
  }

  Future<AuthResponse> signUp(String email, String password,
      {String? fullName}) async {
    state = const AsyncValue.loading();
    try {
      final response = await _dataSource.signUp(
        email,
        password,
        fullName: fullName,
      );
      // State update might be handled by listener if session is established immediately
      return response;
    } catch (e, stackTrace) {
      state = AsyncValue.error(e, stackTrace);
      rethrow;
    }
  }

  Future<void> signOut() async {
    try {
      await _dataSource.signOut();
    } catch (e, stackTrace) {
      state = AsyncValue.error(e, stackTrace);
    }
  }

  @override
  void dispose() {
    _authSubscription.cancel();
    super.dispose();
  }
}
