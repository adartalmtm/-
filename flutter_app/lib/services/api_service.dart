import 'dart:convert';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import '../models/models.dart';

class ApiException implements Exception {
  final int status;
  final String code;
  final String message;

  const ApiException(this.status, this.code, this.message);

  @override
  String toString() => message;
}

class ApiService {
  String baseUrl;
  String? sessionToken;

  ApiService({
    this.baseUrl = const String.fromEnvironment(
      'AL_EQFAL_API_URL',
      defaultValue: 'http://10.0.2.2:3000',
    ),
    this.sessionToken,
  });

  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: <String>['https://www.googleapis.com/auth/drive.file'],
  );

  Uri _uri(String path) {
    final normalized = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    return Uri.parse('$normalized$path');
  }

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, String>? extraHeaders,
    Object? body,
  }) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (sessionToken != null) 'Authorization': 'Bearer $sessionToken',
      ...?extraHeaders,
    };

    late http.Response res;
    if (method == 'GET') {
      res = await http.get(_uri(path), headers: headers);
    } else if (method == 'POST') {
      res = await http.post(
        _uri(path),
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
    } else if (method == 'PATCH') {
      res = await http.patch(
        _uri(path),
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
    } else if (method == 'DELETE') {
      res = await http.delete(_uri(path), headers: headers);
    } else {
      throw UnsupportedError('Unsupported method $method');
    }

    Map<String, dynamic> decoded = const {};
    if (res.body.isNotEmpty) {
      decoded = jsonDecode(res.body) as Map<String, dynamic>;
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException(
        res.statusCode,
        decoded['error']?.toString() ?? 'REQUEST_FAILED',
        decoded['message']?.toString() ?? 'Request failed (${res.statusCode})',
      );
    }

    return decoded;
  }

  Future<WorkspacePayloadModel> connectManagerGoogle() async {
    final account = await _googleSignIn.signIn();
    if (account == null) {
      throw const ApiException(400, 'CANCELLED', 'Google Sign-In cancelled');
    }
    final auth = await account.authentication;
    final accessToken = auth.accessToken;
    if (accessToken == null || accessToken.isEmpty) {
      throw const ApiException(401, 'MISSING_GOOGLE_TOKEN', 'Google access token unavailable');
    }

    final data = await _request(
      'POST',
      '/api/auth/manager-connect',
      extraHeaders: {'Authorization': 'Bearer $accessToken'},
    );
    sessionToken = data['sessionToken']?.toString();
    return WorkspacePayloadModel.fromJson(data['workspace'] as Map<String, dynamic>);
  }

  Future<void> signOutGoogle() async {
    try {
      await _googleSignIn.signOut();
    } catch (_) {}
    sessionToken = null;
  }

  Future<WorkspacePayloadModel> loginEmployee(String username, String password) async {
    final data = await _request(
      'POST',
      '/api/auth/login',
      body: {'username': username, 'password': password},
    );
    sessionToken = data['sessionToken']?.toString();
    return WorkspacePayloadModel.fromJson(data['workspace'] as Map<String, dynamic>);
  }

  Future<WorkspacePayloadModel> fetchWorkspace() async {
    final data = await _request('GET', '/api/workspace');
    return WorkspacePayloadModel.fromJson(data);
  }

  Future<WorkspacePayloadModel> refreshManagerDrive() async {
    final data = await _request('POST', '/api/manager/refresh-drive');
    return WorkspacePayloadModel.fromJson(data);
  }

  Future<String> backupManagerDrive() async {
    final data = await _request('POST', '/api/manager/backup-drive');
    return data['fileName']?.toString() ?? 'al_eqfal_backup.json';
  }

  Future<WorkspacePayloadModel> createSupplier({
    required String name,
    required String taxNumber,
    required String date,
    required String invoiceNumber,
    String? branchId,
  }) async {
    final data = await _request('POST', '/api/suppliers', body: {
      'name': name,
      'taxNumber': taxNumber,
      'date': date,
      'invoiceNumber': invoiceNumber,
      if (branchId != null) 'branchId': branchId,
    });
    return WorkspacePayloadModel.fromJson(data);
  }

  Future<WorkspacePayloadModel> deleteSupplier(String supplierId) async {
    final data = await _request('DELETE', '/api/suppliers/$supplierId');
    return WorkspacePayloadModel.fromJson(data);
  }

  Future<WorkspacePayloadModel> createInvoice({
    required String supplierId,
    required String date,
    required String invoiceNumber,
    required double amount,
    required double paidAmount,
  }) async {
    final data = await _request('POST', '/api/invoices', body: {
      'supplierId': supplierId,
      'date': date,
      'invoiceNumber': invoiceNumber,
      'amount': amount,
      'paidAmount': paidAmount,
    });
    return WorkspacePayloadModel.fromJson(data);
  }

  Future<WorkspacePayloadModel> createShiftSale({
    String? branchId,
    required String date,
    required String shiftName,
    required double salesAmount,
    required double purchasesAmount,
    required String notes,
  }) async {
    final data = await _request('POST', '/api/shifts-sales', body: {
      if (branchId != null) 'branchId': branchId,
      'date': date,
      'shiftName': shiftName,
      'salesAmount': salesAmount,
      'purchasesAmount': purchasesAmount,
      'notes': notes,
    });
    return WorkspacePayloadModel.fromJson(data);
  }

  Future<WorkspacePayloadModel> createBranch(String name) async {
    final data = await _request('POST', '/api/branches', body: {'name': name});
    return WorkspacePayloadModel.fromJson(data);
  }

  Future<WorkspacePayloadModel> createUser({
    required String fullName,
    required String username,
    required String password,
    required String branchId,
    required String status,
    required UserPermissions permissions,
  }) async {
    final data = await _request('POST', '/api/users', body: {
      'fullName': fullName,
      'username': username,
      'password': password,
      'branchId': branchId,
      'status': status,
      'permissions': permissions.toJson(),
    });
    return WorkspacePayloadModel.fromJson(data);
  }

  Future<WorkspacePayloadModel> toggleUserStatus(String userId, String nextStatus) async {
    final data = await _request('PATCH', '/api/users/$userId', body: {'status': nextStatus});
    return WorkspacePayloadModel.fromJson(data);
  }

  Future<WorkspacePayloadModel> deleteUser(String userId) async {
    final data = await _request('DELETE', '/api/users/$userId');
    return WorkspacePayloadModel.fromJson(data);
  }

  Future<Map<String, dynamic>> syncOfflineBatch(List<OfflineOperationModel> ops) async {
    return _request('POST', '/api/sync/batch', body: {
      'operations': ops.map((o) => o.toJson()).toList(),
    });
  }
}
