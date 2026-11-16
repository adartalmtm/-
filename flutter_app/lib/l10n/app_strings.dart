import 'package:intl/intl.dart';

class AppStrings {
  final String lang;
  const AppStrings(this.lang);

  bool get isAr => lang == 'ar';

  String get brandTitle => 'AL EQFAL';
  String get appTitle => isAr ? 'إدارة الموردين – AL EQFAL' : 'Suppliers – AL EQFAL';
  String get navSuppliers => isAr ? 'الموردون' : 'Suppliers';
  String get navInvoices => isAr ? 'الفواتير' : 'Invoices';
  String get navShifts => isAr ? 'الورديات والمبيعات' : 'Shifts & Sales';
  String get navUsers => isAr ? 'إدارة المستخدمين' : 'Users';

  String get loginTitle => isAr ? 'تسجيل الدخول – AL EQFAL' : 'Sign In – AL EQFAL';
  String get loginSubtitle =>
      isAr ? 'اختر نوع الحساب للدخول إلى النظام الموحد' : 'Choose your account type to sign in';
  String get managerTab => isAr ? 'دخول المدير' : 'Manager';
  String get employeeTab => isAr ? 'دخول الموظف' : 'Employee';
  String get managerDesc => isAr
      ? 'يدخل المدير بحساب Google لربط قاعدة البيانات والنسخ الاحتياطي في Google Drive.'
      : 'Manager signs in with Google to sync & backup directly in Google Drive.';
  String get employeeDesc => isAr
      ? 'يدخل الموظف باسم المستخدم وكلمة المرور للوصول إلى فرعه فقط.'
      : 'Employees sign in with username and password for their assigned branch.';
  String get signInWithGoogle => isAr ? 'تسجيل الدخول باستخدام Google' : 'Sign in with Google';
  String get username => isAr ? 'اسم المستخدم' : 'Username';
  String get password => isAr ? 'كلمة المرور' : 'Password';
  String get signIn => isAr ? 'تسجيل الدخول' : 'Sign In';
  String get signOut => isAr ? 'تسجيل الخروج' : 'Sign Out';
  String get serverUrlLabel => isAr ? 'رابط خادم المزامنة' : 'Sync Server URL';

  String get kpiSuppliers => isAr ? 'عدد الموردين' : 'Suppliers';
  String get kpiInvoices => isAr ? 'فواتير المشتريات' : 'Invoices';
  String get kpiPurchases => isAr ? 'إجمالي المشتريات' : 'Purchases';
  String get kpiPayments => isAr ? 'إجمالي المدفوعات' : 'Payments';
  String get kpiPayables => isAr ? 'إجمالي المستحقات' : 'Payables';
  String get sar => isAr ? 'ر.س' : 'SAR';

  String get addSupplier => isAr ? 'إضافة مورد جديد' : 'Add New Supplier';
  String get newInvoice => isAr ? 'فاتورة مشتريات جديدة' : 'New Purchase Invoice';
  String get supplierName => isAr ? 'اسم المورد' : 'Supplier Name';
  String get taxNumber => isAr ? 'الرقم الضريبي للمورد' : 'Tax Number';
  String get date => isAr ? 'التاريخ' : 'Date';
  String get invoiceNumber => isAr ? 'رقم الفاتورة' : 'Invoice Number';
  String get selectSupplier => isAr ? 'اختيار المورد' : 'Select Supplier';
  String get invoiceAmount => isAr ? 'قيمة الفاتورة' : 'Invoice Amount';
  String get paidAmount => isAr ? 'المبلغ المدفوع' : 'Paid Amount';
  String get remaining => isAr ? 'المتبقي' : 'Remaining';
  String get saveAndReturn => isAr ? 'حفظ الفاتورة والعودة للقائمة' : 'Save Invoice & Return';
  String get save => isAr ? 'حفظ' : 'Save';
  String get cancel => isAr ? 'إلغاء' : 'Cancel';
  String get delete => isAr ? 'حذف' : 'Delete';
  String get searchHint => isAr ? 'ابحث باسم المورد أو الرقم الضريبي...' : 'Search name or tax no...';

  String get driveConnected => isAr ? 'متصل بـ Google Drive' : 'Connected to Google Drive';
  String get backupDrive => isAr ? 'نسخة احتياطية في Drive' : 'Backup to Drive';
  String get refreshDrive => isAr ? 'تحديث من Drive' : 'Refresh Drive';
  String get offlineBanner => isAr
      ? 'وضع عدم الاتصال: يتم حفظ العمليات محلياً ومزامنتها عند عودة الإنترنت.'
      : 'Offline mode: entries are saved locally and synced once online.';
  String get syncNow => isAr ? 'مزامنة الآن' : 'Sync Now';
  String get savedOffline => isAr ? 'تم الحفظ محلياً للمزامنة لاحقاً' : 'Saved offline for sync';
  String get duplicateInvoiceErr =>
      isAr ? 'رقم الفاتورة مسجل مسبقاً لنفس المورد' : 'Duplicate invoice number for this supplier';

  String get recordShift => isAr ? 'تسجيل وردية جديدة' : 'Record New Shift';
  String get shiftName => isAr ? 'الوردية' : 'Shift';
  String get salesAmount => isAr ? 'إجمالي المبيعات' : 'Total Sales';
  String get shiftPurchases => isAr ? 'مشتريات الوردية' : 'Shift Purchases';
  String get notes => isAr ? 'ملاحظات' : 'Notes';

  String get addUser => isAr ? 'إضافة مستخدم' : 'Add User';
  String get employeeName => isAr ? 'اسم الموظف' : 'Employee Name';
  String get branch => isAr ? 'الفرع' : 'Branch';
  String get allBranches => isAr ? 'جميع الفروع' : 'All Branches';
  String get statusActive => isAr ? 'نشط' : 'Active';
  String get statusSuspended => isAr ? 'موقوف' : 'Suspended';

  String formatCurrency(double val) {
    final f = NumberFormat('#,##0.00', 'en_US').format(val);
    return '$f $sar';
  }
}
