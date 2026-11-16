import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'l10n/app_strings.dart';
import 'models/models.dart';
import 'screens/dashboard_screen.dart';
import 'screens/login_screen.dart';
import 'screens/shifts_screen.dart';
import 'screens/users_screen.dart';
import 'services/api_service.dart';
import 'services/offline_sync_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AlEqfalApp());
}

class AlEqfalApp extends StatefulWidget {
  const AlEqfalApp({super.key});

  @override
  State<AlEqfalApp> createState() => _AlEqfalAppState();
}

class _AlEqfalAppState extends State<AlEqfalApp> {
  final ApiService _api = ApiService();
  final OfflineSyncService _offline = OfflineSyncService();

  String _lang = 'ar';
  WorkspacePayloadModel? _workspace;
  bool _isBooting = true;
  bool _isBusy = false;
  bool _isOnline = true;
  String? _authError;
  int _tabIndex = 0;
  String _selectedBranchFilter = 'all';
  int _pendingCount = 0;
  StreamSubscription<List<ConnectivityResult>>? _connSub;

  @override
  void initState() {
    super.initState();
    _bootstrap();
    _connSub = Connectivity().onConnectivityChanged.listen((results) {
      final onlineNow = results.any((r) => r != ConnectivityResult.none);
      if (mounted) setState(() => _isOnline = onlineNow);
      if (onlineNow && _workspace != null) {
        _syncPendingQueue();
      }
    });
  }

  @override
  void dispose() {
    _connSub?.cancel();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    final savedLang = await _offline.loadLang();
    final savedUrl = await _offline.loadServerUrl();
    if (savedUrl != null && savedUrl.isNotEmpty) {
      _api.baseUrl = savedUrl;
    }
    final session = await _offline.loadSession();

    WorkspacePayloadModel? restored;
    if (session.token != null && session.userId != null) {
      _api.sessionToken = session.token;
      try {
        restored = await _api.fetchWorkspace();
        await _offline.cacheWorkspace(restored);
      } catch (_) {
        restored = await _offline.loadCachedWorkspace(session.userId!);
      }
    }

    final pending = restored != null
        ? await _offline.getPendingQueue(restored.session.userId)
        : <OfflineOperationModel>[];

    if (mounted) {
      setState(() {
        _lang = savedLang;
        _workspace = restored;
        _pendingCount = pending.length;
        _isBooting = false;
      });
    }
  }

  Future<void> _syncPendingQueue() async {
    final ws = _workspace;
    if (ws == null) return;
    final uid = ws.session.userId;
    final queue = await _offline.getPendingQueue(uid);
    if (queue.isEmpty) return;

    try {
      final res = await _api.syncOfflineBatch(queue);
      final processedIds = ((res['results'] as List?) ?? const [])
          .where((r) => r['status'] == 'applied' || r['status'] == 'skipped')
          .map((r) => r['clientOpId'].toString())
          .toSet();
      final remaining = await _offline.removeProcessedOperations(uid, processedIds);
      final nextWs = WorkspacePayloadModel.fromJson(res['workspace'] as Map<String, dynamic>);
      await _offline.cacheWorkspace(nextWs);
      if (mounted) {
        setState(() {
          _workspace = nextWs;
          _pendingCount = remaining.length;
        });
      }
    } catch (_) {}
  }

  Future<void> _handleManagerGoogleLogin() async {
    setState(() {
      _isBusy = true;
      _authError = null;
    });
    try {
      final ws = await _api.connectManagerGoogle();
      await _offline.saveSession(_api.sessionToken, ws.session.userId);
      await _offline.cacheWorkspace(ws);
      if (mounted) {
        setState(() {
          _workspace = ws;
          _tabIndex = 0;
        });
      }
    } catch (err) {
      if (mounted) setState(() => _authError = err.toString());
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  Future<void> _handleEmployeeLogin(String username, String password) async {
    setState(() {
      _isBusy = true;
      _authError = null;
    });
    try {
      final ws = await _api.loginEmployee(username, password);
      await _offline.saveSession(_api.sessionToken, ws.session.userId);
      await _offline.cacheWorkspace(ws);
      if (mounted) {
        setState(() {
          _workspace = ws;
          _selectedBranchFilter = ws.session.branchId ?? 'all';
          _tabIndex = 0;
        });
      }
    } catch (err) {
      if (mounted) setState(() => _authError = err.toString());
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  Future<void> _handleLogout() async {
    final ws = _workspace;
    if (ws != null) {
      final q = await _offline.getPendingQueue(ws.session.userId);
      if (q.isEmpty) {
        await _offline.clearCachedWorkspace(ws.session.userId);
      }
    }
    await _offline.saveSession(null, null);
    await _api.signOutGoogle();
    if (mounted) {
      setState(() {
        _workspace = null;
        _pendingCount = 0;
      });
    }
  }

  Future<void> _applyMutation(Future<WorkspacePayloadModel> Function() fn) async {
    final ws = await fn();
    await _offline.cacheWorkspace(ws);
    if (mounted) setState(() => _workspace = ws);
  }

  @override
  Widget build(BuildContext context) {
    final s = AppStrings(_lang);

    return MaterialApp(
      title: 'AL EQFAL',
      debugShowCheckedModeBanner: false,
      locale: Locale(_lang),
      supportedLocales: const [Locale('ar'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF1D4ED8),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
      home: _isBooting
          ? const Scaffold(body: Center(child: CircularProgressIndicator()))
          : _workspace == null
              ? LoginScreen(
                  lang: _lang,
                  onChangeLang: (l) async {
                    await _offline.saveLang(l);
                    setState(() => _lang = l);
                  },
                  serverUrl: _api.baseUrl,
                  onChangeServerUrl: (url) async {
                    await _offline.saveServerUrl(url);
                    setState(() => _api.baseUrl = url);
                  },
                  onManagerGoogleLogin: _handleManagerGoogleLogin,
                  onEmployeeLogin: _handleEmployeeLogin,
                  isLoading: _isBusy,
                  error: _authError,
                )
              : _buildWorkspaceShell(context, s, _workspace!),
    );
  }

  Widget _buildWorkspaceShell(
    BuildContext context,
    AppStrings s,
    WorkspacePayloadModel ws,
  ) {
    final session = ws.session;
    final canViewSup = session.isManager ||
        session.permissions.canViewSuppliers ||
        session.permissions.canCreateSuppliers ||
        session.permissions.canCreateInvoices;

    Future<void> handleAddSupplier({
      required String name,
      required String taxNumber,
      required String date,
      required String invoiceNumber,
    }) async {
      final branchId = session.isManager && _selectedBranchFilter != 'all'
          ? _selectedBranchFilter
          : (session.branchId ?? ws.branches.first.id);
      if (!_isOnline) {
        final tempId = 'offline_sup_${DateTime.now().millisecondsSinceEpoch}';
        final nextQ = await _offline.enqueueOperation(
          session.userId,
          OfflineOperationModel(
            clientOpId: 'op_${DateTime.now().millisecondsSinceEpoch}',
            type: 'create_supplier',
            payload: {
              'name': name,
              'taxNumber': taxNumber,
              'date': date,
              'invoiceNumber': invoiceNumber,
              'branchId': branchId,
              'clientTempId': tempId,
            },
          ),
        );
        final now = DateTime.now().toIso8601String();
        final updated = ws.copyWith(
          suppliers: [
            SupplierModel(
              id: tempId,
              branchId: branchId,
              name: name,
              taxNumber: taxNumber,
              createdAt: now,
              updatedAt: now,
            ),
            ...ws.suppliers,
          ],
          invoices: [
            PurchaseInvoiceModel(
              id: 'offline_inv_${DateTime.now().millisecondsSinceEpoch}',
              branchId: branchId,
              supplierId: tempId,
              invoiceNumber: invoiceNumber,
              date: date,
              amount: 0,
              paidAmount: 0,
              createdAt: now,
              updatedAt: now,
            ),
            ...ws.invoices,
          ],
        );
        await _offline.cacheWorkspace(updated);
        setState(() {
          _workspace = updated;
          _pendingCount = nextQ.length;
        });
        return;
      }
      await _applyMutation(() => _api.createSupplier(
            name: name,
            taxNumber: taxNumber,
            date: date,
            invoiceNumber: invoiceNumber,
            branchId: branchId,
          ));
    }

    Future<void> handleAddInvoice({
      required String supplierId,
      required String date,
      required String invoiceNumber,
      required double amount,
      required double paidAmount,
    }) async {
      if (!_isOnline) {
        final nextQ = await _offline.enqueueOperation(
          session.userId,
          OfflineOperationModel(
            clientOpId: 'op_${DateTime.now().millisecondsSinceEpoch}',
            type: 'create_invoice',
            payload: {
              'supplierId': supplierId,
              'date': date,
              'invoiceNumber': invoiceNumber,
              'amount': amount,
              'paidAmount': paidAmount,
            },
          ),
        );
        final now = DateTime.now().toIso8601String();
        final sup = ws.suppliers.firstWhere((e) => e.id == supplierId);
        final updated = ws.copyWith(
          invoices: [
            PurchaseInvoiceModel(
              id: 'offline_inv_${DateTime.now().millisecondsSinceEpoch}',
              branchId: sup.branchId,
              supplierId: supplierId,
              invoiceNumber: invoiceNumber,
              date: date,
              amount: amount,
              paidAmount: paidAmount,
              createdAt: now,
              updatedAt: now,
            ),
            ...ws.invoices,
          ],
        );
        await _offline.cacheWorkspace(updated);
        setState(() {
          _workspace = updated;
          _pendingCount = nextQ.length;
        });
        return;
      }
      await _applyMutation(() => _api.createInvoice(
            supplierId: supplierId,
            date: date,
            invoiceNumber: invoiceNumber,
            amount: amount,
            paidAmount: paidAmount,
          ));
    }

    final pages = <({String label, IconData icon, Widget child})>[
      if (canViewSup)
        (
          label: s.navSuppliers,
          icon: Icons.storefront_outlined,
          child: DashboardScreen(
            workspace: ws,
            lang: _lang,
            selectedBranchFilter: _selectedBranchFilter,
            showInvoicesTab: false,
            onAddSupplier: handleAddSupplier,
            onDeleteSupplier: (id) => _applyMutation(() => _api.deleteSupplier(id)),
            onAddInvoice: handleAddInvoice,
          ),
        ),
      if (canViewSup)
        (
          label: s.navInvoices,
          icon: Icons.receipt_long_outlined,
          child: DashboardScreen(
            workspace: ws,
            lang: _lang,
            selectedBranchFilter: _selectedBranchFilter,
            showInvoicesTab: true,
            onAddSupplier: handleAddSupplier,
            onDeleteSupplier: (id) => _applyMutation(() => _api.deleteSupplier(id)),
            onAddInvoice: handleAddInvoice,
          ),
        ),
      (
        label: s.navShifts,
        icon: Icons.point_of_sale_outlined,
        child: ShiftsScreen(
          workspace: ws,
          lang: _lang,
          selectedBranchFilter: _selectedBranchFilter,
          onAddShift: ({branchId, required date, required shiftName, required salesAmount, required purchasesAmount, required notes}) async {
            final targetBranch = branchId ?? session.branchId ?? ws.branches.first.id;
            if (!_isOnline) {
              final nextQ = await _offline.enqueueOperation(
                session.userId,
                OfflineOperationModel(
                  clientOpId: 'op_${DateTime.now().millisecondsSinceEpoch}',
                  type: 'create_shift_sale',
                  payload: {
                    'branchId': targetBranch,
                    'date': date,
                    'shiftName': shiftName,
                    'salesAmount': salesAmount,
                    'purchasesAmount': purchasesAmount,
                    'notes': notes,
                  },
                ),
              );
              final now = DateTime.now().toIso8601String();
              final updated = ws.copyWith(
                shiftsSales: [
                  ShiftSaleRecordModel(
                    id: 'offline_shift_${DateTime.now().millisecondsSinceEpoch}',
                    branchId: targetBranch,
                    date: date,
                    shiftName: shiftName,
                    employeeId: session.userId,
                    employeeName: session.displayName,
                    salesAmount: salesAmount,
                    purchasesAmount: purchasesAmount,
                    notes: notes,
                    createdAt: now,
                    updatedAt: now,
                  ),
                  ...ws.shiftsSales,
                ],
              );
              await _offline.cacheWorkspace(updated);
              setState(() {
                _workspace = updated;
                _pendingCount = nextQ.length;
              });
              return;
            }
            await _applyMutation(() => _api.createShiftSale(
                  branchId: targetBranch,
                  date: date,
                  shiftName: shiftName,
                  salesAmount: salesAmount,
                  purchasesAmount: purchasesAmount,
                  notes: notes,
                ));
          },
        ),
      ),
      if (session.isManager)
        (
          label: s.navUsers,
          icon: Icons.manage_accounts_outlined,
          child: UsersScreen(
            workspace: ws,
            lang: _lang,
            onCreateUser: ({required fullName, required username, required password, required branchId, required permissions}) =>
                _applyMutation(() => _api.createUser(
                      fullName: fullName,
                      username: username,
                      password: password,
                      branchId: branchId,
                      status: 'active',
                      permissions: permissions,
                    )),
            onToggleStatus: (id, next) => _applyMutation(() => _api.toggleUserStatus(id, next)),
            onDeleteUser: (id) => _applyMutation(() => _api.deleteUser(id)),
            onCreateBranch: (name) => _applyMutation(() => _api.createBranch(name)),
          ),
        ),
    ];

    final safeIdx = _tabIndex >= pages.length ? 0 : _tabIndex;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        title: Text(s.brandTitle, style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          if (session.isManager && _isOnline) ...[
            IconButton(
              tooltip: s.backupDrive,
              icon: const Icon(Icons.archive_outlined),
              onPressed: () async {
                final fileName = await _api.backupManagerDrive();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${s.backupDrive}: $fileName')),
                  );
                }
              },
            ),
            IconButton(
              tooltip: s.refreshDrive,
              icon: const Icon(Icons.sync),
              onPressed: () => _applyMutation(_api.fetchWorkspace),
            ),
          ],
          IconButton(
            tooltip: _lang == 'ar' ? 'English' : 'العربية',
            icon: const Icon(Icons.language),
            onPressed: () async {
              final next = _lang == 'ar' ? 'en' : 'ar';
              await _offline.saveLang(next);
              setState(() => _lang = next);
            },
          ),
          IconButton(
            tooltip: s.signOut,
            icon: const Icon(Icons.logout),
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: Column(
        children: [
          if (!_isOnline || _pendingCount > 0)
            Container(
              width: double.infinity,
              color: !_isOnline ? const Color(0xFFFEF3C7) : const Color(0xFFDBEAFE),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      !_isOnline
                          ? '${s.offlineBanner} ($_pendingCount)'
                          : '${s.savedOffline}: $_pendingCount',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                  if (_isOnline && _pendingCount > 0)
                    TextButton(
                      onPressed: _syncPendingQueue,
                      child: Text(s.syncNow),
                    ),
                ],
              ),
            ),
          Expanded(child: pages[safeIdx].child),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: safeIdx,
        onDestinationSelected: (i) => setState(() => _tabIndex = i),
        destinations: pages
            .map((p) => NavigationDestination(icon: Icon(p.icon), label: p.label))
            .toList(),
      ),
    );
  }
}
