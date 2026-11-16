import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';

class OfflineSyncService {
  static const _cachePrefix = 'al_eqfal_ws_cache_';
  static const _queuePrefix = 'al_eqfal_sync_queue_';
  static const _sessionTokenKey = 'al_eqfal_session_token';
  static const _sessionUidKey = 'al_eqfal_session_uid';
  static const _serverUrlKey = 'al_eqfal_server_url';
  static const _langKey = 'al_eqfal_lang';

  Future<void> saveServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_serverUrlKey, url);
  }

  Future<String?> loadServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_serverUrlKey);
  }

  Future<void> saveLang(String lang) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_langKey, lang);
  }

  Future<String> loadLang() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_langKey) ?? 'ar';
  }

  Future<void> saveSession(String? token, String? userId) async {
    final prefs = await SharedPreferences.getInstance();
    if (token != null && userId != null) {
      await prefs.setString(_sessionTokenKey, token);
      await prefs.setString(_sessionUidKey, userId);
    } else {
      await prefs.remove(_sessionTokenKey);
      await prefs.remove(_sessionUidKey);
    }
  }

  Future<({String? token, String? userId})> loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    return (
      token: prefs.getString(_sessionTokenKey),
      userId: prefs.getString(_sessionUidKey),
    );
  }

  Future<void> cacheWorkspace(WorkspacePayloadModel ws) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_cachePrefix${ws.session.userId}', jsonEncode(ws.toJson()));
  }

  Future<WorkspacePayloadModel?> loadCachedWorkspace(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_cachePrefix$userId');
    if (raw == null || raw.isEmpty) return null;
    try {
      return WorkspacePayloadModel.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> clearCachedWorkspace(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$_cachePrefix$userId');
  }

  Future<List<OfflineOperationModel>> getPendingQueue(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_queuePrefix$userId');
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list
          .map((e) => OfflineOperationModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<OfflineOperationModel>> enqueueOperation(
    String userId,
    OfflineOperationModel op,
  ) async {
    final current = await getPendingQueue(userId);
    final next = [...current, op];
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      '$_queuePrefix$userId',
      jsonEncode(next.map((e) => e.toJson()).toList()),
    );
    return next;
  }

  Future<List<OfflineOperationModel>> removeProcessedOperations(
    String userId,
    Set<String> processedIds,
  ) async {
    final current = await getPendingQueue(userId);
    final remaining = current.where((op) => !processedIds.contains(op.clientOpId)).toList();
    final prefs = await SharedPreferences.getInstance();
    if (remaining.isEmpty) {
      await prefs.remove('$_queuePrefix$userId');
    } else {
      await prefs.setString(
        '$_queuePrefix$userId',
        jsonEncode(remaining.map((e) => e.toJson()).toList()),
      );
    }
    return remaining;
  }
}
