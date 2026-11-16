import 'package:flutter/material.dart';
import '../l10n/app_strings.dart';
import '../models/models.dart';

class ShiftsScreen extends StatelessWidget {
  final WorkspacePayloadModel workspace;
  final String lang;
  final String selectedBranchFilter;
  final Future<void> Function({
    String? branchId,
    required String date,
    required String shiftName,
    required double salesAmount,
    required double purchasesAmount,
    required String notes,
  }) onAddShift;

  const ShiftsScreen({
    super.key,
    required this.workspace,
    required this.lang,
    required this.selectedBranchFilter,
    required this.onAddShift,
  });

  void _openAddShift(BuildContext context, AppStrings s) {
    final dateCtrl = TextEditingController(text: DateTime.now().toIso8601String().substring(0, 10));
    final shiftCtrl = TextEditingController(text: s.isAr ? 'الوردية الصباحية' : 'Morning Shift');
    final salesCtrl = TextEditingController(text: '0');
    final purchCtrl = TextEditingController(text: '0');
    final notesCtrl = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(s.recordShift),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: dateCtrl, decoration: InputDecoration(labelText: s.date)),
              const SizedBox(height: 10),
              TextField(controller: shiftCtrl, decoration: InputDecoration(labelText: s.shiftName)),
              const SizedBox(height: 10),
              TextField(
                controller: salesCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(labelText: s.salesAmount),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: purchCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(labelText: s.shiftPurchases),
              ),
              const SizedBox(height: 10),
              TextField(controller: notesCtrl, decoration: InputDecoration(labelText: s.notes)),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(s.cancel)),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await onAddShift(
                branchId: workspace.session.isManager && selectedBranchFilter != 'all'
                    ? selectedBranchFilter
                    : workspace.session.branchId,
                date: dateCtrl.text.trim(),
                shiftName: shiftCtrl.text.trim(),
                salesAmount: double.tryParse(salesCtrl.text) ?? 0.0,
                purchasesAmount: double.tryParse(purchCtrl.text) ?? 0.0,
                notes: notesCtrl.text.trim(),
              );
            },
            child: Text(s.save),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = AppStrings(lang);
    final canRecord = workspace.session.isManager || workspace.session.permissions.canRecordShiftsSales;
    final records = workspace.shiftsSales.where((r) {
      if (workspace.session.isManager && selectedBranchFilter != 'all') {
        return r.branchId == selectedBranchFilter;
      }
      return true;
    }).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (canRecord)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: FilledButton.icon(
              onPressed: () => _openAddShift(context, s),
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFF1D4ED8)),
              icon: const Icon(Icons.add),
              label: Text(s.recordShift),
            ),
          ),
        const SizedBox(height: 14),
        ...records.map((rec) => Card(
              color: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                title: Text('${rec.date} · ${rec.shiftName}',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(
                  '${rec.employeeName} | ${s.salesAmount}: ${s.formatCurrency(rec.salesAmount)} | '
                  '${s.shiftPurchases}: ${s.formatCurrency(rec.purchasesAmount)}',
                ),
              ),
            )),
      ],
    );
  }
}
