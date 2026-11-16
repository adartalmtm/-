import type { Language } from '../types/suppliers';

export interface TranslationStrings {
  brandTitle: string;
  sectionTitle: string;
  sectionSubtitle: string;
  navDashboard: string;
  navSuppliers: string;
  navInvoices: string;
  newPurchaseInvoiceBtn: string;
  addNewSupplierBtn: string;
  languageArabic: string;
  languageEnglish: string;

  // Google Drive Auth & Sync
  driveConnected: string;
  driveDisconnected: string;
  driveSyncing: string;
  driveSynced: string;
  driveLastSaved: string;
  driveSyncError: string;
  driveConnectTitle: string;
  driveConnectSubtitle: string;
  signInWithGoogle: string;
  signOut: string;
  refreshFromDrive: string;
  reconnectDrive: string;

  // Dashboard KPIs
  kpiSuppliersCount: string;
  kpiInvoicesCount: string;
  kpiTotalPurchases: string;
  kpiTotalPayments: string;
  kpiTotalPayables: string;
  currencySar: string;

  // Search & Export
  searchPlaceholder: string;
  exportExcel: string;
  exportPdf: string;
  exporting: string;
  allSuppliersTitle: string;
  allInvoicesTitle: string;
  showingCount: string;

  // Table Headers
  colSupplierName: string;
  colTaxNumber: string;
  colInvoicesCount: string;
  colTotalPurchases: string;
  colTotalPayments: string;
  colTotalDue: string;
  colLastInvoice: string;
  colActions: string;
  colInvoiceNumber: string;
  colDate: string;
  colAmount: string;
  colPaid: string;
  colRemaining: string;
  colStatus: string;

  // Status labels (plain text)
  statusPaid: string;
  statusPartial: string;
  statusUnpaid: string;

  // Actions
  viewInvoices: string;
  editSupplier: string;
  deleteSupplier: string;
  editInvoice: string;
  deleteInvoice: string;
  addInvoiceForSupplier: string;
  saveAndReturn: string;
  saveChanges: string;
  saveSupplier: string;
  cancel: string;
  confirm: string;
  close: string;

  // Add Supplier Modal (strictly 4 fields)
  addSupplierModalTitle: string;
  addSupplierModalHint: string;
  fieldSupplierName: string;
  fieldTaxNumber: string;
  fieldDate: string;
  fieldInvoiceNumber: string;
  placeholderSupplierName: string;
  placeholderTaxNumber: string;
  placeholderInvoiceNumber: string;

  // Edit Supplier Modal
  editSupplierModalTitle: string;
  editSupplierConfirmHint: string;

  // New Purchase Invoice Modal
  newInvoiceModalTitle: string;
  newInvoiceModalSubtitle: string;
  fieldSelectSupplier: string;
  selectSupplierPlaceholder: string;
  autoFilledTaxNote: string;
  fieldInvoiceAmount: string;
  fieldPaidAmount: string;
  fieldRemainingAmount: string;
  noSuppliersPrompt: string;

  // Edit Invoice Payment/Amount Modal
  editInvoiceModalTitle: string;

  // Supplier Invoices Drawer
  supplierInvoicesTitle: string;
  supplierSummary: string;
  noInvoicesForSupplier: string;

  // Confirmation Dialogs
  confirmDeleteSupplierTitle: string;
  confirmDeleteSupplierBody: string;
  confirmDeleteInvoiceTitle: string;
  confirmDeleteInvoiceBody: string;
  confirmUpdateDriveTitle: string;
  confirmUpdateDriveBody: string;

  // Validation & Errors
  errRequiredField: string;
  errDuplicateInvoiceForSupplier: string;
  errNegativeAmount: string;
  errPaidExceedsAmount: string;
  errDriveSaveFailed: string;
  errDriveLoadFailed: string;
  errAuthRequired: string;

  // Empty & Loading States
  emptySuppliersTitle: string;
  emptySuppliersDesc: string;
  emptySearchTitle: string;
  emptySearchDesc: string;
  emptyInvoicesTitle: string;
  emptyInvoicesDesc: string;
  loadingData: string;

  // PDF Report Strings
  reportTitle: string;
  reportGeneratedOn: string;
  reportPreparedBy: string;
  reportSupplierStatement: string;

  // Auth & Roles
  loginPageTitle: string;
  loginPageSubtitle: string;
  loginTabManager: string;
  loginTabEmployee: string;
  loginManagerDesc: string;
  loginEmployeeDesc: string;
  fieldUsername: string;
  fieldPassword: string;
  placeholderUsername: string;
  placeholderPassword: string;
  signInBtn: string;
  signingInBtn: string;
  roleManagerLabel: string;
  roleEmployeeLabel: string;
  errInvalidCredentials: string;
  errAccountSuspended: string;
  errDriveNotConnectedSession: string;
  errManagerMismatch: string;
  errPermissionDenied: string;
  driveTokenExpiredWarning: string;

  // Navigation & Branches
  navShiftsSales: string;
  navUsersManagement: string;
  allBranches: string;
  branchLabel: string;
  manageBranchesBtn: string;
  branchesModalTitle: string;
  addBranchPlaceholder: string;
  addBranchBtn: string;
  errBranchInUse: string;
  errCannotDeleteLastBranch: string;

  // Shifts & Sales
  shiftsSalesTitle: string;
  shiftsSalesSubtitle: string;
  addShiftSaleBtn: string;
  shiftModalTitle: string;
  fieldShiftName: string;
  shiftMorning: string;
  shiftEvening: string;
  shiftNight: string;
  fieldSalesAmount: string;
  fieldShiftPurchases: string;
  fieldNotes: string;
  colEmployee: string;
  colBranch: string;
  colShift: string;
  colSales: string;
  colShiftPurchases: string;
  colNetShift: string;
  colNotes: string;
  kpiShiftsCount: string;
  kpiTotalSales: string;
  kpiShiftPurchases: string;
  kpiNetSales: string;
  emptyShiftsTitle: string;
  emptyShiftsDesc: string;
  confirmDeleteShiftTitle: string;
  confirmDeleteShiftBody: string;

  // Users Management Page
  usersPageTitle: string;
  usersPageSubtitle: string;
  addUserBtn: string;
  editUserModalTitle: string;
  addUserModalTitle: string;
  fieldEmployeeName: string;
  fieldTempPassword: string;
  fieldNewPasswordOptional: string;
  fieldSelectBranch: string;
  fieldAccountStatus: string;
  statusActive: string;
  statusSuspended: string;
  fieldPermissions: string;
  permRecordShiftsSales: string;
  permViewSuppliers: string;
  permCreateSuppliers: string;
  permCreateInvoices: string;
  permEditInvoices: string;
  permDeleteData: string;
  permExportReports: string;
  toggleSuspend: string;
  toggleActivate: string;
  confirmDeleteUserTitle: string;
  confirmDeleteUserBody: string;
  errDuplicateUsername: string;
  errWeakPassword: string;
  emptyUsersTitle: string;
  emptyUsersDesc: string;
  noSupplierViewPermission: string;

  // Offline Sync, Drive Backup & Mobile PWA Install
  backupToDrive: string;
  backingUpDrive: string;
  backupDriveSuccess: string;
  offlineModeTitle: string;
  offlineModeDesc: string;
  pendingSyncLabel: string;
  syncNowBtn: string;
  syncingNowBtn: string;
  syncCompleteMsg: string;
  savedOfflineQueued: string;
  installAppBtn: string;
  installIosTitle: string;
  installIosStep1: string;
  installIosStep2: string;
  installIosStep3: string;
  gotItBtn: string;

  // Camera Invoice Photo & Mobile Settings
  attachInvoicePhoto: string;
  takeOrChoosePhoto: string;
  replaceInvoicePhoto: string;
  removePhoto: string;
  invoicePhotoAttached: string;
  viewInvoicePhoto: string;
  invoicePhotoPreviewTitle: string;
  invoicePhotoHint: string;
  errCameraFailed: string;
  serverConnectionTitle: string;
  serverUrlLabel: string;
  serverUrlHint: string;
  saveServerUrlBtn: string;
  serverUrlSaved: string;
}

export const translations: Record<Language, TranslationStrings> = {
  ar: {
    brandTitle: 'AL EQFAL',
    sectionTitle: 'إدارة الموردين',
    sectionSubtitle: 'متابعة الموردين وفواتير المشتريات والمدفوعات والمستحقات',
    navDashboard: 'لوحة التحكم',
    navSuppliers: 'الموردون',
    navInvoices: 'فواتير المشتريات',
    newPurchaseInvoiceBtn: 'فاتورة مشتريات جديدة',
    addNewSupplierBtn: 'إضافة مورد جديد',
    languageArabic: 'العربية',
    languageEnglish: 'English',

    driveConnected: 'متصل بـ Google Drive',
    driveDisconnected: 'غير متصل بـ Google Drive',
    driveSyncing: 'جاري الحفظ في Google Drive...',
    driveSynced: 'محفوظ في Google Drive',
    driveLastSaved: 'آخر حفظ',
    driveSyncError: 'تعذر المزامنة مع Google Drive',
    driveConnectTitle: 'اربط حساب Google Drive الخاص بالمدير',
    driveConnectSubtitle:
      'يتم حفظ بيانات الموردين وفواتير المشتريات مباشرة في ملف خاص داخل Google Drive لضمان الأمان والوصول من أي جهاز.',
    signInWithGoogle: 'تسجيل الدخول باستخدام Google',
    signOut: 'تسجيل الخروج',
    refreshFromDrive: 'تحديث من Drive',
    reconnectDrive: 'إعادة الاتصال بـ Drive',

    kpiSuppliersCount: 'عدد الموردين',
    kpiInvoicesCount: 'عدد فواتير المشتريات',
    kpiTotalPurchases: 'إجمالي المشتريات',
    kpiTotalPayments: 'إجمالي المدفوعات',
    kpiTotalPayables: 'إجمالي المستحقات للموردين',
    currencySar: 'ر.س',

    searchPlaceholder: 'ابحث باسم المورد أو الرقم الضريبي...',
    exportExcel: 'تصدير Excel',
    exportPdf: 'تصدير PDF',
    exporting: 'جاري التصدير...',
    allSuppliersTitle: 'قائمة الموردين',
    allInvoicesTitle: 'سجل فواتير المشتريات',
    showingCount: 'النتائج المعروضة',

    colSupplierName: 'اسم المورد',
    colTaxNumber: 'الرقم الضريبي',
    colInvoicesCount: 'الفواتير',
    colTotalPurchases: 'إجمالي المشتريات',
    colTotalPayments: 'المدفوعات',
    colTotalDue: 'المستحقات',
    colLastInvoice: 'آخر فاتورة',
    colActions: 'الإجراءات',
    colInvoiceNumber: 'رقم الفاتورة',
    colDate: 'التاريخ',
    colAmount: 'قيمة الفاتورة',
    colPaid: 'المدفوع',
    colRemaining: 'المتبقي',
    colStatus: 'الحالة',

    statusPaid: 'مسددة',
    statusPartial: 'مدفوعة جزئياً',
    statusUnpaid: 'غير مسددة',

    viewInvoices: 'عرض الفواتير',
    editSupplier: 'تعديل',
    deleteSupplier: 'حذف',
    editInvoice: 'تعديل المبلغ/السداد',
    deleteInvoice: 'حذف الفاتورة',
    addInvoiceForSupplier: 'إضافة فاتورة للمورد',
    saveAndReturn: 'حفظ الفاتورة والعودة للقائمة',
    saveChanges: 'حفظ التعديلات',
    saveSupplier: 'حفظ المورد',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    close: 'إغلاق',

    addSupplierModalTitle: 'إضافة مورد جديد',
    addSupplierModalHint: 'أدخل البيانات الأساسية للمورد وأول فاتورة.',
    fieldSupplierName: 'اسم المورد',
    fieldTaxNumber: 'الرقم الضريبي للمورد',
    fieldDate: 'التاريخ',
    fieldInvoiceNumber: 'رقم الفاتورة',
    placeholderSupplierName: 'مثال: شركة الإمداد المتقدمة',
    placeholderTaxNumber: 'مثال: 300123456700003',
    placeholderInvoiceNumber: 'مثال: INV-2026-001',

    editSupplierModalTitle: 'تعديل بيانات المورد',
    editSupplierConfirmHint: 'سيتم تحديث بيانات المورد في ملف Google Drive.',

    newInvoiceModalTitle: 'فاتورة مشتريات جديدة',
    newInvoiceModalSubtitle: 'اختر المورد ليظهر رقمه الضريبي تلقائياً، ثم أدخل بيانات الفاتورة.',
    fieldSelectSupplier: 'اختيار المورد',
    selectSupplierPlaceholder: 'اختر المورد من القائمة...',
    autoFilledTaxNote: 'يظهر الرقم الضريبي تلقائياً عند اختيار المورد',
    fieldInvoiceAmount: 'قيمة الفاتورة (اختياري)',
    fieldPaidAmount: 'المبلغ المدفوع (اختياري)',
    fieldRemainingAmount: 'المبلغ المستحق',
    noSuppliersPrompt: 'يرجى إضافة مورد أولاً قبل تسجيل فاتورة مشتريات.',

    editInvoiceModalTitle: 'تحديث بيانات الفاتورة والسداد',

    supplierInvoicesTitle: 'فواتير المورد',
    supplierSummary: 'ملخص حساب المورد',
    noInvoicesForSupplier: 'لا توجد فواتير مسجلة لهذا المورد حتى الآن.',

    confirmDeleteSupplierTitle: 'تأكيد حذف المورد',
    confirmDeleteSupplierBody:
      'هل أنت متأكد من حذف هذا المورد؟ سيتم حذف المورد وجميع فواتيره نهائياً من ملف البيانات في Google Drive.',
    confirmDeleteInvoiceTitle: 'تأكيد حذف الفاتورة',
    confirmDeleteInvoiceBody:
      'هل أنت متأكد من حذف هذه الفاتورة؟ سيتم تحديث الملف المحفوظ في Google Drive فوراً.',
    confirmUpdateDriveTitle: 'تأكيد تحديث البيانات في Google Drive',
    confirmUpdateDriveBody:
      'هل تريد حفظ التعديلات وتحديث ملف البيانات في Google Drive؟',

    errRequiredField: 'يرجى تعبئة هذا الحقل المطلوب.',
    errDuplicateInvoiceForSupplier: 'رقم الفاتورة مسجل مسبقاً لنفس المورد ولا يمكن تكراره.',
    errNegativeAmount: 'يجب أن تكون القيمة صفر أو أكبر.',
    errPaidExceedsAmount: 'المبلغ المدفوع لا يمكن أن يتجاوز قيمة الفاتورة.',
    errDriveSaveFailed: 'فشل الحفظ في Google Drive. يرجى التحقق من الاتصال والمحاولة مجدداً.',
    errDriveLoadFailed: 'تعذر تحميل البيانات من Google Drive.',
    errAuthRequired: 'يرجى تسجيل الدخول بحساب Google أولاً لحفظ البيانات في Google Drive.',

    emptySuppliersTitle: 'لا يوجد موردون مسجلون بعد',
    emptySuppliersDesc: 'ابدأ بإضافة أول مورد لتسجيل فواتير المشتريات ومتابعة المستحقات.',
    emptySearchTitle: 'لا توجد نتائج مطابقة للبحث',
    emptySearchDesc: 'جرب البحث باسم مورد آخر أو تحقق من الرقم الضريبي.',
    emptyInvoicesTitle: 'لا توجد فواتير مشتريات مسجلة',
    emptyInvoicesDesc: 'اضغط على «فاتورة مشتريات جديدة» لتسجيل أول فاتورة.',
    loadingData: 'جاري تحميل بيانات الموردين من Google Drive...',

    reportTitle: 'تقرير الموردين وفواتير المشتريات – AL EQFAL',
    reportGeneratedOn: 'تاريخ التقرير',
    reportPreparedBy: 'حساب المدير',
    reportSupplierStatement: 'كشف فواتير المورد',

    loginPageTitle: 'تسجيل الدخول – AL EQFAL',
    loginPageSubtitle: 'اختر نوع الحساب للدخول إلى النظام بأمان',
    loginTabManager: 'دخول المدير',
    loginTabEmployee: 'دخول الموظف',
    loginManagerDesc:
      'يدخل المدير بحساب Google لربط ملف البيانات في Google Drive وإدارة الفروع والمستخدمين والتقارير.',
    loginEmployeeDesc:
      'يدخل الموظف باسم المستخدم وكلمة المرور المحددة من المدير للوصول إلى فرعه فقط.',
    fieldUsername: 'اسم المستخدم',
    fieldPassword: 'كلمة المرور',
    placeholderUsername: 'أدخل اسم المستخدم',
    placeholderPassword: 'أدخل كلمة المرور',
    signInBtn: 'تسجيل الدخول',
    signingInBtn: 'جاري التحقق...',
    roleManagerLabel: 'المدير',
    roleEmployeeLabel: 'موظف',
    errInvalidCredentials: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
    errAccountSuspended: 'تم إيقاف هذا الحساب من قبل المدير. يرجى مراجعة الإدارة.',
    errDriveNotConnectedSession:
      'لم يقم المدير بتسجيل الدخول وربط Google Drive في هذه الجلسة بعد.',
    errManagerMismatch: 'ملف البيانات في Google Drive مرتبط بحساب مدير آخر.',
    errPermissionDenied: 'ليست لديك صلاحية لتنفيذ هذه العملية.',
    driveTokenExpiredWarning:
      'انتهت صلاحية جلسة Google Drive المؤقتة. اضغط إعادة الاتصال لحفظ التعديلات المعلقة.',

    navShiftsSales: 'الورديات والمبيعات',
    navUsersManagement: 'إدارة المستخدمين',
    allBranches: 'جميع الفروع',
    branchLabel: 'الفرع',
    manageBranchesBtn: 'إدارة الفروع',
    branchesModalTitle: 'إدارة الفروع',
    addBranchPlaceholder: 'اسم الفرع الجديد...',
    addBranchBtn: 'إضافة فرع',
    errBranchInUse: 'لا يمكن حذف فرع مرتبط بموظفين أو موردين أو ورديات.',
    errCannotDeleteLastBranch: 'يجب الإبقاء على فرع واحد على الأقل.',

    shiftsSalesTitle: 'الورديات والمبيعات والمشتريات اليومية',
    shiftsSalesSubtitle: 'تسجيل ومتابعة الورديات والمبيعات والمشتريات الخاصة بكل فرع',
    addShiftSaleBtn: 'تسجيل وردية جديدة',
    shiftModalTitle: 'تسجيل وردية ومبيعات جديدة',
    fieldShiftName: 'الوردية',
    shiftMorning: 'الوردية الصباحية',
    shiftEvening: 'الوردية المسائية',
    shiftNight: 'الوردية الليلية',
    fieldSalesAmount: 'إجمالي المبيعات',
    fieldShiftPurchases: 'مشتريات الوردية',
    fieldNotes: 'ملاحظات (اختياري)',
    colEmployee: 'الموظف',
    colBranch: 'الفرع',
    colShift: 'الوردية',
    colSales: 'المبيعات',
    colShiftPurchases: 'المشتريات',
    colNetShift: 'الصافي',
    colNotes: 'ملاحظات',
    kpiShiftsCount: 'عدد الورديات',
    kpiTotalSales: 'إجمالي المبيعات',
    kpiShiftPurchases: 'مشتريات الورديات',
    kpiNetSales: 'صافي المبيعات',
    emptyShiftsTitle: 'لا توجد ورديات مسجلة بعد',
    emptyShiftsDesc: 'سجل أول وردية لمتابعة المبيعات والمشتريات في هذا الفرع.',
    confirmDeleteShiftTitle: 'تأكيد حذف سجل الوردية',
    confirmDeleteShiftBody: 'هل أنت متأكد من حذف سجل الوردية والمبيعات هذا؟',

    usersPageTitle: 'إدارة المستخدمين والصلاحيات',
    usersPageSubtitle: 'إنشاء حسابات الموظفين، تحديد الفروع، والتحكم الكامل في الصلاحيات وحالة الحساب',
    addUserBtn: 'إضافة مستخدم',
    editUserModalTitle: 'تعديل بيانات المستخدم وصلاحياته',
    addUserModalTitle: 'إضافة مستخدم جديد',
    fieldEmployeeName: 'اسم الموظف',
    fieldTempPassword: 'كلمة المرور المؤقتة',
    fieldNewPasswordOptional: 'كلمة مرور جديدة (اتركها فارغة للإبقاء على الحالية)',
    fieldSelectBranch: 'الفرع التابع له',
    fieldAccountStatus: 'حالة الحساب',
    statusActive: 'نشط',
    statusSuspended: 'موقوف',
    fieldPermissions: 'صلاحيات المستخدم',
    permRecordShiftsSales: 'تسجيل الورديات والمبيعات والمشتريات',
    permViewSuppliers: 'الاطلاع على الموردين وفواتير المشتريات',
    permCreateSuppliers: 'إضافة مورد جديد',
    permCreateInvoices: 'تسجيل فاتورة مشتريات جديدة',
    permEditInvoices: 'تعديل الفواتير المحفوظة والموردين',
    permDeleteData: 'حذف البيانات والفواتير والموردين',
    permExportReports: 'تصدير تقارير Excel وPDF',
    toggleSuspend: 'إيقاف',
    toggleActivate: 'تفعيل',
    confirmDeleteUserTitle: 'تأكيد حذف المستخدم',
    confirmDeleteUserBody: 'هل أنت متأكد من حذف حساب هذا الموظف نهائياً؟',
    errDuplicateUsername: 'اسم المستخدم مسجل مسبقاً. يرجى اختيار اسم آخر.',
    errWeakPassword: 'يجب أن تكون كلمة المرور 4 أحرف على الأقل.',
    emptyUsersTitle: 'لا يوجد موظفون مسجلون بعد',
    emptyUsersDesc: 'أضف أول موظف وحدد له الفرع والصلاحيات الخاصة بعمله.',
    noSupplierViewPermission: 'لا توجد صلاحية للاطلاع على بيانات الموردين لهذا الحساب.',

    backupToDrive: 'نسخة احتياطية في Drive',
    backingUpDrive: 'جاري إنشاء النسخة...',
    backupDriveSuccess: 'تم حفظ نسخة احتياطية جديدة في Google Drive',
    offlineModeTitle: 'وضع عدم الاتصال بالإنترنت',
    offlineModeDesc: 'تعمل الآن من النسخة المحفوظة محلياً. سيتم مزامنة العمليات الجديدة تلقائياً عند عودة الاتصال.',
    pendingSyncLabel: 'عمليات بانتظار المزامنة',
    syncNowBtn: 'مزامنة الآن',
    syncingNowBtn: 'جاري المزامنة...',
    syncCompleteMsg: 'تمت مزامنة جميع العمليات المعلقة بنجاح',
    savedOfflineQueued: 'تم الحفظ محلياً في وضع عدم الاتصال، وستتم المزامنة تلقائياً عند عودة الإنترنت.',
    installAppBtn: 'تثبيت التطبيق',
    installIosTitle: 'تثبيت AL EQFAL على الآيفون',
    installIosStep1: '1. اضغط على زر المشاركة في شريط Safari بالأسفل.',
    installIosStep2: '2. اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen).',
    installIosStep3: '3. اضغط «إضافة» ليظهر AL EQFAL كتطبيق مستقل يعمل دون إنترنت.',
    gotItBtn: 'حسناً',

    attachInvoicePhoto: 'صورة الفاتورة (اختياري)',
    takeOrChoosePhoto: 'تصوير الفاتورة أو اختيار صورة',
    replaceInvoicePhoto: 'تغيير الصورة',
    removePhoto: 'حذف الصورة',
    invoicePhotoAttached: 'مرفق صورة',
    viewInvoicePhoto: 'عرض صورة الفاتورة',
    invoicePhotoPreviewTitle: 'معاينة صورة الفاتورة',
    invoicePhotoHint: 'يتم ضغط الصورة تلقائياً وحفظها مع بيانات الفاتورة في Google Drive.',
    errCameraFailed: 'تعذر التقاط أو قراءة الصورة. تأكد من منح صلاحية الكاميرا.',
    serverConnectionTitle: 'عنوان خادم التطبيق (API Server)',
    serverUrlLabel: 'رابط الخادم',
    serverUrlHint: 'أدخل رابط خادم AL EQFAL المرتبط بـ Google Drive للاتصال من تطبيق الجوال.',
    saveServerUrlBtn: 'حفظ عنوان الخادم',
    serverUrlSaved: 'تم حفظ عنوان الخادم بنجاح.',
  },
  en: {
    brandTitle: 'AL EQFAL',
    sectionTitle: 'Suppliers Management',
    sectionSubtitle: 'Manage suppliers, purchase invoices, payments, and outstanding payables',
    navDashboard: 'Dashboard',
    navSuppliers: 'Suppliers',
    navInvoices: 'Purchase Invoices',
    newPurchaseInvoiceBtn: 'New Purchase Invoice',
    addNewSupplierBtn: 'Add New Supplier',
    languageArabic: 'العربية',
    languageEnglish: 'English',

    driveConnected: 'Connected to Google Drive',
    driveDisconnected: 'Not connected to Google Drive',
    driveSyncing: 'Saving to Google Drive...',
    driveSynced: 'Saved in Google Drive',
    driveLastSaved: 'Last saved',
    driveSyncError: 'Failed to sync with Google Drive',
    driveConnectTitle: "Connect Manager's Google Drive",
    driveConnectSubtitle:
      'All supplier records and purchase invoices are stored directly in a dedicated file inside your Google Drive.',
    signInWithGoogle: 'Sign in with Google',
    signOut: 'Sign Out',
    refreshFromDrive: 'Refresh from Drive',
    reconnectDrive: 'Reconnect Drive',

    kpiSuppliersCount: 'Total Suppliers',
    kpiInvoicesCount: 'Purchase Invoices',
    kpiTotalPurchases: 'Total Purchases',
    kpiTotalPayments: 'Total Payments',
    kpiTotalPayables: 'Total Payables Due',
    currencySar: 'SAR',

    searchPlaceholder: 'Search by supplier name or tax number...',
    exportExcel: 'Export Excel',
    exportPdf: 'Export PDF',
    exporting: 'Exporting...',
    allSuppliersTitle: 'Suppliers Directory',
    allInvoicesTitle: 'Purchase Invoices Ledger',
    showingCount: 'Showing',

    colSupplierName: 'Supplier Name',
    colTaxNumber: 'Tax Number',
    colInvoicesCount: 'Invoices',
    colTotalPurchases: 'Total Purchases',
    colTotalPayments: 'Payments',
    colTotalDue: 'Balance Due',
    colLastInvoice: 'Latest Invoice',
    colActions: 'Actions',
    colInvoiceNumber: 'Invoice No.',
    colDate: 'Date',
    colAmount: 'Invoice Amount',
    colPaid: 'Paid',
    colRemaining: 'Due',
    colStatus: 'Status',

    statusPaid: 'Paid',
    statusPartial: 'Partial',
    statusUnpaid: 'Unpaid',

    viewInvoices: 'Invoices',
    editSupplier: 'Edit',
    deleteSupplier: 'Delete',
    editInvoice: 'Edit Amount / Payment',
    deleteInvoice: 'Delete Invoice',
    addInvoiceForSupplier: 'Add Invoice for Supplier',
    saveAndReturn: 'Save Invoice & Return to List',
    saveChanges: 'Save Changes',
    saveSupplier: 'Save Supplier',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',

    addSupplierModalTitle: 'Add New Supplier',
    addSupplierModalHint: 'Enter the basic supplier details and initial invoice.',
    fieldSupplierName: 'Supplier Name',
    fieldTaxNumber: 'Supplier Tax Number',
    fieldDate: 'Date',
    fieldInvoiceNumber: 'Invoice Number',
    placeholderSupplierName: 'e.g. Advanced Supply Co.',
    placeholderTaxNumber: 'e.g. 300123456700003',
    placeholderInvoiceNumber: 'e.g. INV-2026-001',

    editSupplierModalTitle: 'Edit Supplier Details',
    editSupplierConfirmHint: 'Supplier details will be updated in Google Drive.',

    newInvoiceModalTitle: 'New Purchase Invoice',
    newInvoiceModalSubtitle: 'Select a supplier to auto-fill their tax number, then enter the invoice details.',
    fieldSelectSupplier: 'Select Supplier',
    selectSupplierPlaceholder: 'Choose a registered supplier...',
    autoFilledTaxNote: 'Tax number is populated automatically upon selecting a supplier',
    fieldInvoiceAmount: 'Invoice Amount (Optional)',
    fieldPaidAmount: 'Paid Amount (Optional)',
    fieldRemainingAmount: 'Balance Due',
    noSuppliersPrompt: 'Please add a supplier first before recording a purchase invoice.',

    editInvoiceModalTitle: 'Update Invoice Amount & Payment',

    supplierInvoicesTitle: 'Supplier Invoices',
    supplierSummary: 'Supplier Account Summary',
    noInvoicesForSupplier: 'No invoices recorded for this supplier yet.',

    confirmDeleteSupplierTitle: 'Confirm Supplier Deletion',
    confirmDeleteSupplierBody:
      'Are you sure you want to delete this supplier? This will permanently remove the supplier and all associated invoices from Google Drive.',
    confirmDeleteInvoiceTitle: 'Confirm Invoice Deletion',
    confirmDeleteInvoiceBody:
      'Are you sure you want to delete this invoice? Your Google Drive file will be updated immediately.',
    confirmUpdateDriveTitle: 'Confirm Update to Google Drive',
    confirmUpdateDriveBody:
      'Save these changes and overwrite the supplier data file in Google Drive?',

    errRequiredField: 'This field is required.',
    errDuplicateInvoiceForSupplier: 'This invoice number already exists for this supplier.',
    errNegativeAmount: 'Amount must be zero or greater.',
    errPaidExceedsAmount: 'Paid amount cannot exceed invoice amount.',
    errDriveSaveFailed: 'Failed to save to Google Drive. Please check your connection and try again.',
    errDriveLoadFailed: 'Failed to load supplier data from Google Drive.',
    errAuthRequired: 'Please sign in with Google first to save data to Google Drive.',

    emptySuppliersTitle: 'No Suppliers Registered Yet',
    emptySuppliersDesc: 'Start by adding your first supplier to track purchase invoices and payables.',
    emptySearchTitle: 'No Matching Suppliers',
    emptySearchDesc: 'Try searching with a different supplier name or tax number.',
    emptyInvoicesTitle: 'No Purchase Invoices Yet',
    emptyInvoicesDesc: 'Click "New Purchase Invoice" to record your first purchase invoice.',
    loadingData: 'Loading suppliers data from Google Drive...',

    reportTitle: 'AL EQFAL – Suppliers & Purchase Invoices Report',
    reportGeneratedOn: 'Report Date',
    reportPreparedBy: 'Manager Account',
    reportSupplierStatement: 'Supplier Invoices Statement',

    loginPageTitle: 'Sign In – AL EQFAL',
    loginPageSubtitle: 'Choose your account type to securely access the system',
    loginTabManager: 'Manager Sign In',
    loginTabEmployee: 'Employee Sign In',
    loginManagerDesc:
      'Manager signs in with Google to connect Google Drive storage and manage branches, users, and reports.',
    loginEmployeeDesc:
      'Employees sign in with the username and password set by the manager to access their assigned branch only.',
    fieldUsername: 'Username',
    fieldPassword: 'Password',
    placeholderUsername: 'Enter username',
    placeholderPassword: 'Enter password',
    signInBtn: 'Sign In',
    signingInBtn: 'Verifying...',
    roleManagerLabel: 'Manager',
    roleEmployeeLabel: 'Employee',
    errInvalidCredentials: 'Invalid username or password.',
    errAccountSuspended: 'This account has been suspended by the manager.',
    errDriveNotConnectedSession:
      'Manager has not signed in and connected Google Drive in this session yet.',
    errManagerMismatch: 'This Google Drive database belongs to a different manager account.',
    errPermissionDenied: 'You do not have permission to perform this action.',
    driveTokenExpiredWarning:
      'Google Drive temporary authorization expired. Click Reconnect to sync pending changes.',

    navShiftsSales: 'Shifts & Sales',
    navUsersManagement: 'Users Management',
    allBranches: 'All Branches',
    branchLabel: 'Branch',
    manageBranchesBtn: 'Manage Branches',
    branchesModalTitle: 'Branches Management',
    addBranchPlaceholder: 'New branch name...',
    addBranchBtn: 'Add Branch',
    errBranchInUse: 'Cannot delete a branch assigned to employees, suppliers, or shift records.',
    errCannotDeleteLastBranch: 'At least one branch must remain.',

    shiftsSalesTitle: 'Shifts, Sales & Daily Purchases',
    shiftsSalesSubtitle: 'Record and monitor shifts, sales, and daily purchases per branch',
    addShiftSaleBtn: 'Record New Shift',
    shiftModalTitle: 'Record New Shift & Sales',
    fieldShiftName: 'Shift',
    shiftMorning: 'Morning Shift',
    shiftEvening: 'Evening Shift',
    shiftNight: 'Night Shift',
    fieldSalesAmount: 'Total Sales',
    fieldShiftPurchases: 'Shift Purchases',
    fieldNotes: 'Notes (Optional)',
    colEmployee: 'Employee',
    colBranch: 'Branch',
    colShift: 'Shift',
    colSales: 'Sales',
    colShiftPurchases: 'Purchases',
    colNetShift: 'Net',
    colNotes: 'Notes',
    kpiShiftsCount: 'Total Shifts',
    kpiTotalSales: 'Total Sales',
    kpiShiftPurchases: 'Shift Purchases',
    kpiNetSales: 'Net Sales',
    emptyShiftsTitle: 'No Shift Records Yet',
    emptyShiftsDesc: 'Record the first shift to track sales and purchases for this branch.',
    confirmDeleteShiftTitle: 'Confirm Shift Deletion',
    confirmDeleteShiftBody: 'Are you sure you want to delete this shift and sales record?',

    usersPageTitle: 'Users & Permissions Management',
    usersPageSubtitle: 'Create employee accounts, assign branches, and control permissions and account status',
    addUserBtn: 'Add User',
    editUserModalTitle: 'Edit User & Permissions',
    addUserModalTitle: 'Add New User',
    fieldEmployeeName: 'Employee Name',
    fieldTempPassword: 'Temporary Password',
    fieldNewPasswordOptional: 'New Password (leave blank to keep current)',
    fieldSelectBranch: 'Assigned Branch',
    fieldAccountStatus: 'Account Status',
    statusActive: 'Active',
    statusSuspended: 'Suspended',
    fieldPermissions: 'User Permissions',
    permRecordShiftsSales: 'Record shifts, sales & purchases',
    permViewSuppliers: 'View suppliers & purchase invoices',
    permCreateSuppliers: 'Add new suppliers',
    permCreateInvoices: 'Record new purchase invoices',
    permEditInvoices: 'Edit saved invoices & suppliers',
    permDeleteData: 'Delete data, invoices & suppliers',
    permExportReports: 'Export Excel & PDF reports',
    toggleSuspend: 'Suspend',
    toggleActivate: 'Activate',
    confirmDeleteUserTitle: 'Confirm User Deletion',
    confirmDeleteUserBody: 'Are you sure you want to permanently delete this employee account?',
    errDuplicateUsername: 'Username already exists. Please choose another one.',
    errWeakPassword: 'Password must be at least 4 characters.',
    emptyUsersTitle: 'No Employees Added Yet',
    emptyUsersDesc: 'Add your first employee account, assign their branch, and configure permissions.',
    noSupplierViewPermission: 'This account does not have permission to view suppliers data.',

    backupToDrive: 'Backup to Drive',
    backingUpDrive: 'Backing up...',
    backupDriveSuccess: 'Backup snapshot saved in Google Drive',
    offlineModeTitle: 'Offline Mode',
    offlineModeDesc: 'Working from cached branch data. New entries will sync automatically once back online.',
    pendingSyncLabel: 'Pending offline changes',
    syncNowBtn: 'Sync Now',
    syncingNowBtn: 'Syncing...',
    syncCompleteMsg: 'All pending offline changes synced safely',
    savedOfflineQueued: 'Saved locally offline and queued for automatic synchronization.',
    installAppBtn: 'Install App',
    installIosTitle: 'Install AL EQFAL on iPhone',
    installIosStep1: '1. Tap the Share button in Safari at the bottom of your screen.',
    installIosStep2: '2. Scroll down and tap "Add to Home Screen".',
    installIosStep3: '3. Tap "Add" to install AL EQFAL with full offline support.',
    gotItBtn: 'Got it',

    attachInvoicePhoto: 'Invoice Photo (Optional)',
    takeOrChoosePhoto: 'Take Photo or Choose Image',
    replaceInvoicePhoto: 'Replace Photo',
    removePhoto: 'Remove Photo',
    invoicePhotoAttached: 'Photo attached',
    viewInvoicePhoto: 'View Invoice Photo',
    invoicePhotoPreviewTitle: 'Invoice Photo Preview',
    invoicePhotoHint: 'Images are compressed automatically and saved with the invoice in Google Drive.',
    errCameraFailed: 'Unable to capture or load photo. Please verify camera permissions.',
    serverConnectionTitle: 'App Server URL (API Server)',
    serverUrlLabel: 'Server URL',
    serverUrlHint: 'Enter your deployed AL EQFAL server URL connected to Google Drive.',
    saveServerUrlBtn: 'Save Server URL',
    serverUrlSaved: 'Server URL saved.',
  },
};

export function formatCurrency(amount: number, lang: Language): string {
  const formatted = new Intl.NumberFormat(lang === 'ar' ? 'en-US' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
  return `${formatted} ${translations[lang].currencySar}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value || 0);
}
