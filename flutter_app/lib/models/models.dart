class BranchModel {
  final String id;
  final String name;
  final String? code;
  final String createdAt;

  const BranchModel({
    required this.id,
    required this.name,
    this.code,
    required this.createdAt,
  });

  factory BranchModel.fromJson(Map<String, dynamic> json) => BranchModel(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        code: json['code']?.toString(),
        createdAt: json['createdAt']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        if (code != null) 'code': code,
        'createdAt': createdAt,
      };
}

class UserPermissions {
  final bool canRecordShiftsSales;
  final bool canViewSuppliers;
  final bool canCreateSuppliers;
  final bool canCreateInvoices;
  final bool canEditInvoices;
  final bool canDeleteData;
  final bool canExportReports;

  const UserPermissions({
    required this.canRecordShiftsSales,
    required this.canViewSuppliers,
    required this.canCreateSuppliers,
    required this.canCreateInvoices,
    required this.canEditInvoices,
    required this.canDeleteData,
    required this.canExportReports,
  });

  factory UserPermissions.fromJson(Map<String, dynamic> json) => UserPermissions(
        canRecordShiftsSales: json['canRecordShiftsSales'] == true,
        canViewSuppliers: json['canViewSuppliers'] == true,
        canCreateSuppliers: json['canCreateSuppliers'] == true,
        canCreateInvoices: json['canCreateInvoices'] == true,
        canEditInvoices: json['canEditInvoices'] == true,
        canDeleteData: json['canDeleteData'] == true,
        canExportReports: json['canExportReports'] == true,
      );

  Map<String, dynamic> toJson() => {
        'canRecordShiftsSales': canRecordShiftsSales,
        'canViewSuppliers': canViewSuppliers,
        'canCreateSuppliers': canCreateSuppliers,
        'canCreateInvoices': canCreateInvoices,
        'canEditInvoices': canEditInvoices,
        'canDeleteData': canDeleteData,
        'canExportReports': canExportReports,
      };
}

class PublicUserAccount {
  final String id;
  final String fullName;
  final String username;
  final String role;
  final String branchId;
  final String status; // 'active' | 'suspended'
  final UserPermissions permissions;
  final String createdAt;
  final String updatedAt;

  const PublicUserAccount({
    required this.id,
    required this.fullName,
    required this.username,
    required this.role,
    required this.branchId,
    required this.status,
    required this.permissions,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PublicUserAccount.fromJson(Map<String, dynamic> json) => PublicUserAccount(
        id: json['id']?.toString() ?? '',
        fullName: json['fullName']?.toString() ?? '',
        username: json['username']?.toString() ?? '',
        role: json['role']?.toString() ?? 'employee',
        branchId: json['branchId']?.toString() ?? '',
        status: json['status']?.toString() ?? 'active',
        permissions: UserPermissions.fromJson(
          (json['permissions'] as Map<String, dynamic>?) ?? const {},
        ),
        createdAt: json['createdAt']?.toString() ?? '',
        updatedAt: json['updatedAt']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'fullName': fullName,
        'username': username,
        'role': role,
        'branchId': branchId,
        'status': status,
        'permissions': permissions.toJson(),
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };
}

class SupplierModel {
  final String id;
  final String branchId;
  final String name;
  final String taxNumber;
  final String createdAt;
  final String updatedAt;

  const SupplierModel({
    required this.id,
    required this.branchId,
    required this.name,
    required this.taxNumber,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SupplierModel.fromJson(Map<String, dynamic> json) => SupplierModel(
        id: json['id']?.toString() ?? '',
        branchId: json['branchId']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        taxNumber: json['taxNumber']?.toString() ?? '',
        createdAt: json['createdAt']?.toString() ?? '',
        updatedAt: json['updatedAt']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'branchId': branchId,
        'name': name,
        'taxNumber': taxNumber,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };
}

class PurchaseInvoiceModel {
  final String id;
  final String branchId;
  final String supplierId;
  final String invoiceNumber;
  final String date;
  final double amount;
  final double paidAmount;
  final String? createdBy;
  final String createdAt;
  final String updatedAt;

  const PurchaseInvoiceModel({
    required this.id,
    required this.branchId,
    required this.supplierId,
    required this.invoiceNumber,
    required this.date,
    required this.amount,
    required this.paidAmount,
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  double get remaining => (amount - paidAmount) < 0 ? 0 : (amount - paidAmount);

  factory PurchaseInvoiceModel.fromJson(Map<String, dynamic> json) => PurchaseInvoiceModel(
        id: json['id']?.toString() ?? '',
        branchId: json['branchId']?.toString() ?? '',
        supplierId: json['supplierId']?.toString() ?? '',
        invoiceNumber: json['invoiceNumber']?.toString() ?? '',
        date: json['date']?.toString() ?? '',
        amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
        paidAmount: (json['paidAmount'] as num?)?.toDouble() ?? 0.0,
        createdBy: json['createdBy']?.toString(),
        createdAt: json['createdAt']?.toString() ?? '',
        updatedAt: json['updatedAt']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'branchId': branchId,
        'supplierId': supplierId,
        'invoiceNumber': invoiceNumber,
        'date': date,
        'amount': amount,
        'paidAmount': paidAmount,
        if (createdBy != null) 'createdBy': createdBy,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };
}

class ShiftSaleRecordModel {
  final String id;
  final String branchId;
  final String date;
  final String shiftName;
  final String employeeId;
  final String employeeName;
  final double salesAmount;
  final double purchasesAmount;
  final String notes;
  final String createdAt;
  final String updatedAt;

  const ShiftSaleRecordModel({
    required this.id,
    required this.branchId,
    required this.date,
    required this.shiftName,
    required this.employeeId,
    required this.employeeName,
    required this.salesAmount,
    required this.purchasesAmount,
    required this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ShiftSaleRecordModel.fromJson(Map<String, dynamic> json) => ShiftSaleRecordModel(
        id: json['id']?.toString() ?? '',
        branchId: json['branchId']?.toString() ?? '',
        date: json['date']?.toString() ?? '',
        shiftName: json['shiftName']?.toString() ?? '',
        employeeId: json['employeeId']?.toString() ?? '',
        employeeName: json['employeeName']?.toString() ?? '',
        salesAmount: (json['salesAmount'] as num?)?.toDouble() ?? 0.0,
        purchasesAmount: (json['purchasesAmount'] as num?)?.toDouble() ?? 0.0,
        notes: json['notes']?.toString() ?? '',
        createdAt: json['createdAt']?.toString() ?? '',
        updatedAt: json['updatedAt']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'branchId': branchId,
        'date': date,
        'shiftName': shiftName,
        'employeeId': employeeId,
        'employeeName': employeeName,
        'salesAmount': salesAmount,
        'purchasesAmount': purchasesAmount,
        'notes': notes,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };
}

class AuthSessionModel {
  final String role; // 'manager' | 'employee'
  final String userId;
  final String displayName;
  final String? email;
  final String? username;
  final String? branchId;
  final String? branchName;
  final UserPermissions permissions;

  const AuthSessionModel({
    required this.role,
    required this.userId,
    required this.displayName,
    this.email,
    this.username,
    this.branchId,
    this.branchName,
    required this.permissions,
  });

  bool get isManager => role == 'manager';

  factory AuthSessionModel.fromJson(Map<String, dynamic> json) => AuthSessionModel(
        role: json['role']?.toString() ?? 'employee',
        userId: json['userId']?.toString() ?? '',
        displayName: json['displayName']?.toString() ?? '',
        email: json['email']?.toString(),
        username: json['username']?.toString(),
        branchId: json['branchId']?.toString(),
        branchName: json['branchName']?.toString(),
        permissions: UserPermissions.fromJson(
          (json['permissions'] as Map<String, dynamic>?) ?? const {},
        ),
      );

  Map<String, dynamic> toJson() => {
        'role': role,
        'userId': userId,
        'displayName': displayName,
        if (email != null) 'email': email,
        if (username != null) 'username': username,
        if (branchId != null) 'branchId': branchId,
        if (branchName != null) 'branchName': branchName,
        'permissions': permissions.toJson(),
      };
}

class WorkspacePayloadModel {
  final AuthSessionModel session;
  final List<BranchModel> branches;
  final List<PublicUserAccount> users;
  final List<SupplierModel> suppliers;
  final List<PurchaseInvoiceModel> invoices;
  final List<ShiftSaleRecordModel> shiftsSales;
  final String driveSyncStatus;
  final String? lastSyncedAt;

  const WorkspacePayloadModel({
    required this.session,
    required this.branches,
    required this.users,
    required this.suppliers,
    required this.invoices,
    required this.shiftsSales,
    required this.driveSyncStatus,
    this.lastSyncedAt,
  });

  factory WorkspacePayloadModel.fromJson(Map<String, dynamic> json) => WorkspacePayloadModel(
        session: AuthSessionModel.fromJson(
          (json['session'] as Map<String, dynamic>?) ?? const {},
        ),
        branches: ((json['branches'] as List?) ?? const [])
            .map((e) => BranchModel.fromJson(e as Map<String, dynamic>))
            .toList(),
        users: ((json['users'] as List?) ?? const [])
            .map((e) => PublicUserAccount.fromJson(e as Map<String, dynamic>))
            .toList(),
        suppliers: ((json['suppliers'] as List?) ?? const [])
            .map((e) => SupplierModel.fromJson(e as Map<String, dynamic>))
            .toList(),
        invoices: ((json['invoices'] as List?) ?? const [])
            .map((e) => PurchaseInvoiceModel.fromJson(e as Map<String, dynamic>))
            .toList(),
        shiftsSales: ((json['shiftsSales'] as List?) ?? const [])
            .map((e) => ShiftSaleRecordModel.fromJson(e as Map<String, dynamic>))
            .toList(),
        driveSyncStatus: json['driveSyncStatus']?.toString() ?? 'disconnected',
        lastSyncedAt: json['lastSyncedAt']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'session': session.toJson(),
        'branches': branches.map((b) => b.toJson()).toList(),
        'users': users.map((u) => u.toJson()).toList(),
        'suppliers': suppliers.map((s) => s.toJson()).toList(),
        'invoices': invoices.map((i) => i.toJson()).toList(),
        'shiftsSales': shiftsSales.map((r) => r.toJson()).toList(),
        'driveSyncStatus': driveSyncStatus,
        if (lastSyncedAt != null) 'lastSyncedAt': lastSyncedAt,
      };

  WorkspacePayloadModel copyWith({
    List<SupplierModel>? suppliers,
    List<PurchaseInvoiceModel>? invoices,
    List<ShiftSaleRecordModel>? shiftsSales,
  }) =>
      WorkspacePayloadModel(
        session: session,
        branches: branches,
        users: users,
        suppliers: suppliers ?? this.suppliers,
        invoices: invoices ?? this.invoices,
        shiftsSales: shiftsSales ?? this.shiftsSales,
        driveSyncStatus: driveSyncStatus,
        lastSyncedAt: lastSyncedAt,
      );
}

class OfflineOperationModel {
  final String clientOpId;
  final String type; // 'create_supplier' | 'create_invoice' | 'create_shift_sale'
  final Map<String, dynamic> payload;

  const OfflineOperationModel({
    required this.clientOpId,
    required this.type,
    required this.payload,
  });

  factory OfflineOperationModel.fromJson(Map<String, dynamic> json) => OfflineOperationModel(
        clientOpId: json['clientOpId']?.toString() ?? '',
        type: json['type']?.toString() ?? '',
        payload: (json['payload'] as Map<String, dynamic>?) ?? const {},
      );

  Map<String, dynamic> toJson() => {
        'clientOpId': clientOpId,
        'type': type,
        'payload': payload,
      };
}
