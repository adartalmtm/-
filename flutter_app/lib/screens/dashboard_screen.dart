import 'package:flutter/material.dart';
import '../l10n/app_strings.dart';
import '../models/models.dart';

class DashboardScreen extends StatefulWidget {
  final WorkspacePayloadModel workspace;
  final String lang;
  final String selectedBranchFilter;
  final bool showInvoicesTab;
  final Future<void> Function({
    required String name,
    required String taxNumber,
    required String date,
    required String invoiceNumber,
  }) onAddSupplier;
  final Future<void> Function(String supplierId) onDeleteSupplier;
  final Future<void> Function({
    required String supplierId,
    required String date,
    required String invoiceNumber,
    required double amount,
    required double paidAmount,
  }) onAddInvoice;

  const DashboardScreen({
    super.key,
    required this.workspace,
    required this.lang,
    required this.selectedBranchFilter,
    required this.showInvoicesTab,
    required this.onAddSupplier,
    required this.onDeleteSupplier,
    required this.onAddInvoice,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _search = '';

  List<SupplierModel> get _scopedSuppliers {
    final all = widget.workspace.suppliers;
    if (widget.workspace.session.isManager && widget.selectedBranchFilter != 'all') {
      return all.where((s) => s.branchId == widget.selectedBranchFilter).toList();
    }
    return all;
  }

  List<PurchaseInvoiceModel> get _scopedInvoices {
    final all = widget.workspace.invoices;
    if (widget.workspace.session.isManager && widget.selectedBranchFilter != 'all') {
      return all.where((inv) => inv.branchId == widget.selectedBranchFilter).toList();
    }
    return all;
  }

  void _openAddSupplierDialog(AppStrings s) {
    final nameCtrl = TextEditingController();
    final taxCtrl = TextEditingController();
    final dateCtrl = TextEditingController(text: DateTime.now().toIso8601String().substring(0, 10));
    final invCtrl = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(s.addSupplier),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameCtrl, decoration: InputDecoration(labelText: s.supplierName)),
              const SizedBox(height: 10),
              TextField(controller: taxCtrl, decoration: InputDecoration(labelText: s.taxNumber)),
              const SizedBox(height: 10),
              TextField(controller: dateCtrl, decoration: InputDecoration(labelText: s.date)),
              const SizedBox(height: 10),
              TextField(controller: invCtrl, decoration: InputDecoration(labelText: s.invoiceNumber)),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(s.cancel)),
          FilledButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty ||
                  taxCtrl.text.trim().isEmpty ||
                  dateCtrl.text.trim().isEmpty ||
                  invCtrl.text.trim().isEmpty) {
                return;
              }
              Navigator.pop(ctx);
              await widget.onAddSupplier(
                name: nameCtrl.text.trim(),
                taxNumber: taxCtrl.text.trim(),
                date: dateCtrl.text.trim(),
                invoiceNumber: invCtrl.text.trim(),
              );
            },
            child: Text(s.save),
          ),
        ],
      ),
    );
  }

  void _openNewInvoiceDialog(AppStrings s, {String? preselectedSupplierId}) {
    final suppliers = _scopedSuppliers;
    if (suppliers.isEmpty) return;
    String selectedId = preselectedSupplierId ?? suppliers.first.id;
    final dateCtrl = TextEditingController(text: DateTime.now().toIso8601String().substring(0, 10));
    final invCtrl = TextEditingController();
    final amountCtrl = TextEditingController(text: '0');
    final paidCtrl = TextEditingController(text: '0');
    String? errorMsg;

    showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final selectedSupplier = suppliers.firstWhere(
            (sup) => sup.id == selectedId,
            orElse: () => suppliers.first,
          );
          return AlertDialog(
            title: Text(s.newInvoice),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DropdownButtonFormField<String>(
                    value: selectedId,
                    decoration: InputDecoration(labelText: s.selectSupplier),
                    items: suppliers
                        .map((sup) => DropdownMenuItem(value: sup.id, child: Text(sup.name)))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setDialogState(() => selectedId = val);
                    },
                  ),
                  const SizedBox(height: 10),
                  InputDecorator(
                    decoration: InputDecoration(labelText: s.taxNumber),
                    child: Text(selectedSupplier.taxNumber),
                  ),
                  const SizedBox(height: 10),
                  TextField(controller: dateCtrl, decoration: InputDecoration(labelText: s.date)),
                  const SizedBox(height: 10),
                  TextField(controller: invCtrl, decoration: InputDecoration(labelText: s.invoiceNumber)),
                  const SizedBox(height: 10),
                  TextField(
                    controller: amountCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: s.invoiceAmount),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: paidCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: s.paidAmount),
                  ),
                  if (errorMsg != null) ...[
                    const SizedBox(height: 8),
                    Text(errorMsg!, style: const TextStyle(color: Colors.red, fontSize: 12)),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: Text(s.cancel)),
              FilledButton(
                onPressed: () async {
                  final invNo = invCtrl.text.trim();
                  if (invNo.isEmpty || dateCtrl.text.trim().isEmpty) return;
                  final dup = widget.workspace.invoices.any(
                    (i) =>
                        i.supplierId == selectedId &&
                        i.invoiceNumber.trim().toLowerCase() == invNo.toLowerCase(),
                  );
                  if (dup) {
                    setDialogState(() => errorMsg = s.duplicateInvoiceErr);
                    return;
                  }
                  Navigator.pop(ctx);
                  await widget.onAddInvoice(
                    supplierId: selectedId,
                    date: dateCtrl.text.trim(),
                    invoiceNumber: invNo,
                    amount: double.tryParse(amountCtrl.text) ?? 0.0,
                    paidAmount: double.tryParse(paidCtrl.text) ?? 0.0,
                  );
                },
                child: Text(s.saveAndReturn),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = AppStrings(widget.lang);
    final session = widget.workspace.session;
    final canCreateSupplier = session.isManager || session.permissions.canCreateSuppliers;
    final canCreateInvoice = session.isManager || session.permissions.canCreateInvoices;
    final canDelete = session.isManager || session.permissions.canDeleteData;

    final suppliers = _scopedSuppliers;
    final invoices = _scopedInvoices;
    final totalPurchases = invoices.fold<double>(0, (sum, i) => sum + i.amount);
    final totalPayments = invoices.fold<double>(0, (sum, i) => sum + i.paidAmount);
    final totalPayables = (totalPurchases - totalPayments) < 0 ? 0.0 : (totalPurchases - totalPayments);

    final filteredSuppliers = suppliers.where((sup) {
      final q = _search.trim().toLowerCase();
      if (q.isEmpty) return true;
      return sup.name.toLowerCase().contains(q) || sup.taxNumber.toLowerCase().contains(q);
    }).toList();

    final supplierMap = {for (final sup in widget.workspace.suppliers) sup.id: sup};

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _KpiTile(label: s.kpiSuppliers, value: '${suppliers.length}'),
            _KpiTile(label: s.kpiInvoices, value: '${invoices.length}'),
            _KpiTile(label: s.kpiPurchases, value: s.formatCurrency(totalPurchases)),
            _KpiTile(label: s.kpiPayments, value: s.formatCurrency(totalPayments), color: Colors.green.shade700),
            _KpiTile(label: s.kpiPayables, value: s.formatCurrency(totalPayables), color: Colors.red.shade700),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: TextField(
                onChanged: (v) => setState(() => _search = v),
                decoration: InputDecoration(
                  hintText: s.searchHint,
                  prefixIcon: const Icon(Icons.search),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            if (canCreateInvoice)
              FilledButton.icon(
                onPressed: () => _openNewInvoiceDialog(s),
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF1D4ED8)),
                icon: const Icon(Icons.receipt_long),
                label: Text(s.newInvoice),
              ),
            if (canCreateSupplier)
              OutlinedButton.icon(
                onPressed: () => _openAddSupplierDialog(s),
                icon: const Icon(Icons.add_business),
                label: Text(s.addSupplier),
              ),
          ],
        ),
        const SizedBox(height: 16),
        if (!widget.showInvoicesTab)
          ...filteredSuppliers.map((sup) {
            final supInvs = invoices.where((i) => i.supplierId == sup.id).toList();
            final supTotal = supInvs.fold<double>(0, (sum, i) => sum + i.amount);
            final supPaid = supInvs.fold<double>(0, (sum, i) => sum + i.paidAmount);
            final supDue = (supTotal - supPaid) < 0 ? 0.0 : (supTotal - supPaid);
            return Card(
              color: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                title: Text(sup.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(
                  '${s.taxNumber}: ${sup.taxNumber} · ${supInvs.length} ${s.kpiInvoices}\n'
                  '${s.kpiPurchases}: ${s.formatCurrency(supTotal)} | ${s.kpiPayables}: ${s.formatCurrency(supDue)}',
                ),
                trailing: canDelete
                    ? IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                        onPressed: () => widget.onDeleteSupplier(sup.id),
                      )
                    : null,
              ),
            );
          })
        else
          ...invoices.map((inv) {
            final sup = supplierMap[inv.supplierId];
            return Card(
              color: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                title: Text('#${inv.invoiceNumber} — ${sup?.name ?? '-'}',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(
                  '${inv.date} · ${s.invoiceAmount}: ${s.formatCurrency(inv.amount)} · '
                  '${s.paidAmount}: ${s.formatCurrency(inv.paidAmount)} · '
                  '${s.remaining}: ${s.formatCurrency(inv.remaining)}',
                ),
              ),
            );
          }),
      ],
    );
  }
}

class _KpiTile extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;

  const _KpiTile({required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 165,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color ?? const Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }
}
