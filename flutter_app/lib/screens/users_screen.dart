import 'package:flutter/material.dart';
import '../l10n/app_strings.dart';
import '../models/models.dart';

class UsersScreen extends StatelessWidget {
  final WorkspacePayloadModel workspace;
  final String lang;
  final Future<void> Function({
    required String fullName,
    required String username,
    required String password,
    required String branchId,
    required UserPermissions permissions,
  }) onCreateUser;
  final Future<void> Function(String userId, String nextStatus) onToggleStatus;
  final Future<void> Function(String userId) onDeleteUser;
  final Future<void> Function(String name) onCreateBranch;

  const UsersScreen({
    super.key,
    required this.workspace,
    required this.lang,
    required this.onCreateUser,
    required this.onToggleStatus,
    required this.onDeleteUser,
    required this.onCreateBranch,
  });

  void _openAddUser(BuildContext context, AppStrings s) {
    final nameCtrl = TextEditingController();
    final userCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    String branchId = workspace.branches.first.id;
    bool canShifts = true;
    bool canViewSup = true;
    bool canCreateSup = false;
    bool canCreateInv = true;
    bool canEditInv = false;
    bool canDelete = false;
    bool canExport = false;

    showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialog) => AlertDialog(
          title: Text(s.addUser),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nameCtrl, decoration: InputDecoration(labelText: s.employeeName)),
                const SizedBox(height: 8),
                TextField(controller: userCtrl, decoration: InputDecoration(labelText: s.username)),
                const SizedBox(height: 8),
                TextField(
                  controller: passCtrl,
                  obscureText: true,
                  decoration: InputDecoration(labelText: s.password),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: branchId,
                  decoration: InputDecoration(labelText: s.branch),
                  items: workspace.branches
                      .map((b) => DropdownMenuItem(value: b.id, child: Text(b.name)))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setDialog(() => branchId = v);
                  },
                ),
                CheckboxListTile(
                  value: canShifts,
                  title: Text(s.navShifts),
                  onChanged: (v) => setDialog(() => canShifts = v ?? false),
                ),
                CheckboxListTile(
                  value: canViewSup,
                  title: Text(s.navSuppliers),
                  onChanged: (v) => setDialog(() => canViewSup = v ?? false),
                ),
                CheckboxListTile(
                  value: canCreateInv,
                  title: Text(s.newInvoice),
                  onChanged: (v) => setDialog(() => canCreateInv = v ?? false),
                ),
                CheckboxListTile(
                  value: canCreateSup,
                  title: Text(s.addSupplier),
                  onChanged: (v) => setDialog(() => canCreateSup = v ?? false),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(s.cancel)),
            FilledButton(
              onPressed: () async {
                if (nameCtrl.text.trim().isEmpty ||
                    userCtrl.text.trim().isEmpty ||
                    passCtrl.text.length < 4) {
                  return;
                }
                Navigator.pop(ctx);
                await onCreateUser(
                  fullName: nameCtrl.text.trim(),
                  username: userCtrl.text.trim(),
                  password: passCtrl.text,
                  branchId: branchId,
                  permissions: UserPermissions(
                    canRecordShiftsSales: canShifts,
                    canViewSuppliers: canViewSup,
                    canCreateSuppliers: canCreateSup,
                    canCreateInvoices: canCreateInv,
                    canEditInvoices: canEditInv,
                    canDeleteData: canDelete,
                    canExportReports: canExport,
                  ),
                );
              },
              child: Text(s.save),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = AppStrings(lang);
    final branchMap = {for (final b in workspace.branches) b.id: b.name};

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            FilledButton.icon(
              onPressed: () => _openAddUser(context, s),
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFF1D4ED8)),
              icon: const Icon(Icons.person_add_outlined),
              label: Text(s.addUser),
            ),
            OutlinedButton.icon(
              onPressed: () {
                final branchCtrl = TextEditingController();
                showDialog<void>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: Text(s.branch),
                    content: TextField(
                      controller: branchCtrl,
                      decoration: InputDecoration(labelText: s.branch),
                    ),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: Text(s.cancel)),
                      FilledButton(
                        onPressed: () async {
                          if (branchCtrl.text.trim().isEmpty) return;
                          Navigator.pop(ctx);
                          await onCreateBranch(branchCtrl.text.trim());
                        },
                        child: Text(s.save),
                      ),
                    ],
                  ),
                );
              },
              icon: const Icon(Icons.apartment_outlined),
              label: Text('${s.save} ${s.branch}'),
            ),
          ],
        ),
        const SizedBox(height: 14),
        ...workspace.users.map((u) {
          final isActive = u.status == 'active';
          return Card(
            color: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              title: Text(u.fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text(
                '${u.username} · ${branchMap[u.branchId] ?? '-'} · '
                '${isActive ? s.statusActive : s.statusSuspended}',
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: Icon(
                      isActive ? Icons.pause_circle_outline : Icons.play_circle_outline,
                      color: isActive ? Colors.orange.shade700 : Colors.green.shade700,
                    ),
                    onPressed: () => onToggleStatus(u.id, isActive ? 'suspended' : 'active'),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                    onPressed: () => onDeleteUser(u.id),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }
}
