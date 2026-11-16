import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type {
  DashboardStats,
  Language,
  PurchaseInvoice,
  Supplier,
  SupplierWithStats,
} from '../types/suppliers';
import { formatCurrency, translations } from '../i18n/translations';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function saveOrShareExportFile(params: {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  shareTitle: string;
}): Promise<void> {
  const { fileName, mimeType, bytes, shareTitle } = params;

  if (Capacitor.isNativePlatform()) {
    const base64Data = uint8ArrayToBase64(bytes);
    const written = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
    });
    await Share.share({
      title: shareTitle,
      url: written.uri,
      dialogTitle: shareTitle,
    });
    return;
  }

  const normalizedBytes = new Uint8Array(bytes.byteLength);
  normalizedBytes.set(bytes);
  const blob = new Blob([normalizedBytes.buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getTodayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function estimateColumnWidth(text: string): number {
  const str = String(text ?? '');
  let weight = 0;
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    // Arabic / wide characters take slightly more horizontal space in Excel fonts
    weight += code > 255 ? 1.25 : 1.0;
  }
  return Math.ceil(weight) + 5;
}

export async function exportSuppliersToExcel(params: {
  suppliers: SupplierWithStats[];
  invoices: PurchaseInvoice[];
  allSuppliersMap: Map<string, Supplier>;
  lang: Language;
  singleSupplier?: SupplierWithStats | null;
}): Promise<void> {
  const { suppliers, invoices, allSuppliersMap, lang, singleSupplier } = params;
  const t = translations[lang];
  const isRtl = lang === 'ar';
  const horizontalAlign: 'right' | 'left' = isRtl ? 'right' : 'left';
  const fontName = isRtl ? 'Arial' : 'Calibri';
  const currencySymbol = t.currencySar;
  const currencyNumFmt = `#,##0.00 "${currencySymbol}"`;

  const targetSuppliers = singleSupplier ? [singleSupplier] : suppliers;
  const targetInvoices = singleSupplier
    ? invoices.filter((inv) => inv.supplierId === singleSupplier.id)
    : invoices;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AL EQFAL';
  workbook.created = new Date();

  const sheetName = lang === 'ar' ? 'تقرير الموردين' : 'Suppliers Report';
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: isRtl }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };

  const whiteFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFFFF' },
  };

  const totalFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' },
  };

  // Track max width for all 7 columns (A..G)
  const colMaxWidths = [16, 16, 16, 18, 18, 18, 18];
  const registerWidth = (colIndex1Based: number, text: string) => {
    const idx = colIndex1Based - 1;
    if (idx >= 0 && idx < colMaxWidths.length) {
      colMaxWidths[idx] = Math.max(colMaxWidths[idx], estimateColumnWidth(text));
    }
  };
  const registerMoneyWidth = (colIndex1Based: number, amount: number) => {
    const formatted = `${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0)} ${currencySymbol}`;
    registerWidth(colIndex1Based, formatted);
  };

  // Deterministic row coordinates so Table 1 formulas link accurately to Table 2
  const supTitleRowNum = 1;
  const supHeaderRowNum = 2;
  const supStartRowNum = 3;
  const supEndRowNum = targetSuppliers.length > 0 ? supStartRowNum + targetSuppliers.length - 1 : 2;
  const supTotalRowNum = targetSuppliers.length > 0 ? supEndRowNum + 1 : 3;

  const blankSpacerRowNum = supTotalRowNum + 1;
  const invTitleRowNum = blankSpacerRowNum + 1;
  const invHeaderRowNum = invTitleRowNum + 1;
  const invStartRowNum = invHeaderRowNum + 1;
  const invEndRowNum = targetInvoices.length > 0 ? invStartRowNum + targetInvoices.length - 1 : invHeaderRowNum;
  const invTotalRowNum = targetInvoices.length > 0 ? invEndRowNum + 1 : invStartRowNum;

  // ==========================================
  // Section 1: قائمة الموردين (Suppliers List)
  // ==========================================
  const suppliersSectionTitle = lang === 'ar' ? 'قائمة الموردين' : 'Suppliers List';
  const supTitleRow = sheet.getRow(supTitleRowNum);
  supTitleRow.getCell(1).value = suppliersSectionTitle;
  sheet.mergeCells(supTitleRowNum, 1, supTitleRowNum, 6);
  supTitleRow.getCell(1).font = {
    name: fontName,
    size: 14,
    bold: true,
    color: { argb: 'FF0F172A' },
  };
  supTitleRow.getCell(1).alignment = {
    horizontal: horizontalAlign,
    vertical: 'middle',
  };
  supTitleRow.height = 28;

  const supplierHeaders = [
    t.colSupplierName,
    t.colTaxNumber,
    lang === 'ar' ? 'عدد الفواتير' : t.colInvoicesCount,
    t.colTotalPurchases,
    t.colTotalPayments,
    t.colTotalDue,
  ];

  const supHeaderRow = sheet.getRow(supHeaderRowNum);
  supHeaderRow.height = 24;
  supplierHeaders.forEach((headerText, idx) => {
    const col = idx + 1;
    const cell = supHeaderRow.getCell(col);
    cell.value = headerText;
    cell.fill = headerFill;
    cell.border = thinBorder;
    cell.font = {
      name: fontName,
      size: 11,
      bold: true,
      color: { argb: 'FF1E293B' },
    };
    cell.alignment = {
      horizontal: col === 3 ? 'center' : horizontalAlign,
      vertical: 'middle',
    };
    registerWidth(col, headerText);
  });

  const hasInvoices = targetInvoices.length > 0;

  targetSuppliers.forEach((sup, idx) => {
    const r = supStartRowNum + idx;
    const row = sheet.getRow(r);
    row.height = 22;

    const cName = row.getCell(1);
    cName.value = sup.name;
    cName.font = { name: fontName, size: 11, bold: true, color: { argb: 'FF0F172A' } };
    cName.alignment = { horizontal: horizontalAlign, vertical: 'middle' };
    registerWidth(1, sup.name);

    const cTax = row.getCell(2);
    cTax.value = sup.taxNumber;
    cTax.numFmt = '@';
    cTax.font = { name: fontName, size: 11, color: { argb: 'FF334155' } };
    cTax.alignment = { horizontal: horizontalAlign, vertical: 'middle' };
    registerWidth(2, sup.taxNumber);

    const cCount = row.getCell(3);
    cCount.value = hasInvoices
      ? {
          formula: `COUNTIFS($C$${invStartRowNum}:$C$${invEndRowNum},A${r},$D$${invStartRowNum}:$D$${invEndRowNum},B${r})`,
          result: sup.invoiceCount,
        }
      : 0;
    cCount.numFmt = '#,##0';
    cCount.font = { name: fontName, size: 11, color: { argb: 'FF0F172A' } };
    cCount.alignment = { horizontal: 'center', vertical: 'middle' };

    const cPurchases = row.getCell(4);
    const purchasesVal = Number(sup.totalPurchases.toFixed(2));
    cPurchases.value = hasInvoices
      ? {
          formula: `SUMIFS($E$${invStartRowNum}:$E$${invEndRowNum},$C$${invStartRowNum}:$C$${invEndRowNum},A${r},$D$${invStartRowNum}:$D$${invEndRowNum},B${r})`,
          result: purchasesVal,
        }
      : 0;
    cPurchases.numFmt = currencyNumFmt;
    cPurchases.font = { name: fontName, size: 11, color: { argb: 'FF0F172A' } };
    cPurchases.alignment = { horizontal: horizontalAlign, vertical: 'middle' };
    registerMoneyWidth(4, purchasesVal);

    const cPayments = row.getCell(5);
    const paymentsVal = Number(sup.totalPayments.toFixed(2));
    cPayments.value = hasInvoices
      ? {
          formula: `SUMIFS($F$${invStartRowNum}:$F$${invEndRowNum},$C$${invStartRowNum}:$C$${invEndRowNum},A${r},$D$${invStartRowNum}:$D$${invEndRowNum},B${r})`,
          result: paymentsVal,
        }
      : 0;
    cPayments.numFmt = currencyNumFmt;
    cPayments.font = { name: fontName, size: 11, bold: true, color: { argb: 'FF047857' } };
    cPayments.alignment = { horizontal: horizontalAlign, vertical: 'middle' };
    registerMoneyWidth(5, paymentsVal);

    const cDue = row.getCell(6);
    const dueVal = Number(sup.totalDue.toFixed(2));
    cDue.value = {
      formula: `D${r}-E${r}`,
      result: dueVal,
    };
    cDue.numFmt = currencyNumFmt;
    cDue.font = {
      name: fontName,
      size: 11,
      bold: true,
      color: { argb: dueVal > 0 ? 'FFB91C1C' : 'FF0F172A' },
    };
    cDue.alignment = { horizontal: horizontalAlign, vertical: 'middle' };
    registerMoneyWidth(6, dueVal);

    for (let col = 1; col <= 6; col += 1) {
      row.getCell(col).fill = whiteFill;
      row.getCell(col).border = thinBorder;
    }
  });

  // Table 1 Totals Row
  const totalLabel = lang === 'ar' ? 'الإجمالي' : 'Total';
  const supTotalRow = sheet.getRow(supTotalRowNum);
  supTotalRow.height = 24;
  const totalPurchasesSum = Number(
    targetSuppliers.reduce((acc, s) => acc + s.totalPurchases, 0).toFixed(2)
  );
  const totalPaymentsSum = Number(
    targetSuppliers.reduce((acc, s) => acc + s.totalPayments, 0).toFixed(2)
  );
  const totalDueSum = Number(targetSuppliers.reduce((acc, s) => acc + s.totalDue, 0).toFixed(2));
  const totalInvoicesCount = targetSuppliers.reduce((acc, s) => acc + s.invoiceCount, 0);

  supTotalRow.getCell(1).value = totalLabel;
  supTotalRow.getCell(1).font = { name: fontName, size: 11, bold: true, color: { argb: 'FF0F172A' } };
  supTotalRow.getCell(1).alignment = { horizontal: horizontalAlign, vertical: 'middle' };

  supTotalRow.getCell(2).value = '';

  supTotalRow.getCell(3).value =
    targetSuppliers.length > 0
      ? { formula: `SUM(C${supStartRowNum}:C${supEndRowNum})`, result: totalInvoicesCount }
      : 0;
  supTotalRow.getCell(3).numFmt = '#,##0';
  supTotalRow.getCell(3).font = { name: fontName, size: 11, bold: true, color: { argb: 'FF0F172A' } };
  supTotalRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

  supTotalRow.getCell(4).value =
    targetSuppliers.length > 0
      ? { formula: `SUM(D${supStartRowNum}:D${supEndRowNum})`, result: totalPurchasesSum }
      : 0;
  supTotalRow.getCell(4).numFmt = currencyNumFmt;
  supTotalRow.getCell(4).font = { name: fontName, size: 11, bold: true, color: { argb: 'FF0F172A' } };
  supTotalRow.getCell(4).alignment = { horizontal: horizontalAlign, vertical: 'middle' };
  registerMoneyWidth(4, totalPurchasesSum);

  supTotalRow.getCell(5).value =
    targetSuppliers.length > 0
      ? { formula: `SUM(E${supStartRowNum}:E${supEndRowNum})`, result: totalPaymentsSum }
      : 0;
  supTotalRow.getCell(5).numFmt = currencyNumFmt;
  supTotalRow.getCell(5).font = { name: fontName, size: 11, bold: true, color: { argb: 'FF047857' } };
  supTotalRow.getCell(5).alignment = { horizontal: horizontalAlign, vertical: 'middle' };
  registerMoneyWidth(5, totalPaymentsSum);

  supTotalRow.getCell(6).value =
    targetSuppliers.length > 0
      ? { formula: `SUM(F${supStartRowNum}:F${supEndRowNum})`, result: totalDueSum }
      : 0;
  supTotalRow.getCell(6).numFmt = currencyNumFmt;
  supTotalRow.getCell(6).font = {
    name: fontName,
    size: 11,
    bold: true,
    color: { argb: totalDueSum > 0 ? 'FFB91C1C' : 'FF0F172A' },
  };
  supTotalRow.getCell(6).alignment = { horizontal: horizontalAlign, vertical: 'middle' };
  registerMoneyWidth(6, totalDueSum);

  for (let col = 1; col <= 6; col += 1) {
    supTotalRow.getCell(col).fill = totalFill;
    supTotalRow.getCell(col).border = thinBorder;
  }

  // Spacer row
  sheet.getRow(blankSpacerRowNum).height = 18;

  // ====================================================
  // Section 2: سجل فواتير المشتريات (Purchase Invoices)
  // ====================================================
  const invoicesSectionTitle = lang === 'ar' ? 'سجل فواتير المشتريات' : 'Purchase Invoices Log';
  const invTitleRow = sheet.getRow(invTitleRowNum);
  invTitleRow.getCell(1).value = invoicesSectionTitle;
  sheet.mergeCells(invTitleRowNum, 1, invTitleRowNum, 7);
  invTitleRow.getCell(1).font = {
    name: fontName,
    size: 14,
    bold: true,
    color: { argb: 'FF0F172A' },
  };
  invTitleRow.getCell(1).alignment = {
    horizontal: horizontalAlign,
    vertical: 'middle',
  };
  invTitleRow.height = 28;

  const invoiceHeaders = [
    t.colInvoiceNumber,
    t.colDate,
    t.colSupplierName,
    t.colTaxNumber,
    t.colAmount,
    t.colPaid,
    t.colRemaining,
  ];

  const invHeaderRow = sheet.getRow(invHeaderRowNum);
  invHeaderRow.height = 24;
  invoiceHeaders.forEach((headerText, idx) => {
    const col = idx + 1;
    const cell = invHeaderRow.getCell(col);
    cell.value = headerText;
    cell.fill = headerFill;
    cell.border = thinBorder;
    cell.font = {
      name: fontName,
      size: 11,
      bold: true,
      color: { argb: 'FF1E293B' },
    };
    cell.alignment = {
      horizontal: horizontalAlign,
      vertical: 'middle',
    };
    registerWidth(col, headerText);
  });

  const sortedInvoices = [...targetInvoices].sort((a, b) => b.date.localeCompare(a.date));

  sortedInvoices.forEach((inv, idx) => {
    const r = invStartRowNum + idx;
    const row = sheet.getRow(r);
    row.height = 22;

    const sup = allSuppliersMap.get(inv.supplierId);
    const supName = sup?.name || '-';
    const supTax = sup?.taxNumber || '-';
    const amt = Number((inv.amount || 0).toFixed(2));
    const paid = Number((inv.paidAmount || 0).toFixed(2));
    const remaining = Number(Math.max(0, amt - paid).toFixed(2));

    const cInvNo = row.getCell(1);
    cInvNo.value = inv.invoiceNumber;
    cInvNo.numFmt = '@';
    cInvNo.font = { name: fontName, size: 11, bold: true, color: { argb: 'FF0F172A' } };
    cInvNo.alignment = { horizontal: horizontalAlign, vertical: 'middle' };
    registerWidth(1, inv.invoiceNumber);

    const cDate = row.getCell(2);
    cDate.value = inv.date;
    cDate.numFmt = '@';
    cDate.font = { name: fontName, size: 11, color: { argb: 'FF334155' } };
    cDate.alignment = { horizontal: horizontalAlign, vertical: 'middle' };
    registerWidth(2, inv.date);

    const cSupName = row.getCell(3);
    cSupName.value = supName;
    cSupName.font = { name: fontName, size: 11, color: { argb: 'FF0F172A' } };
    cSupName.alignment = { horizontal: horizontalAlign, vertical: 'middle' };
    registerWidth(3, supName);

    const cSupTax = row.getCell(4);
    cSupTax.value = supTax;
    cSupTax.numFmt = '@';
    cSupTax.font = { name: fontName, size: 11, color: { argb: 'FF334155' } };
    cSupTax.alignment = { horizontal: horizontalAlign, vertical: 'middle' };
    registerWidth(4, supTax);

    const cAmt = row.getCell(5);
    cAmt.value = amt;
    cAmt.numFmt = currencyNumFmt;
    cAmt.font = { name: fontName, size: 11, color: { argb: 'FF0F172A' } };
    cAmt.alignment = { horizontal: horizontalAlign, vertical: 'middle' };
    registerMoneyWidth(5, amt);

    const cPaid = row.getCell(6);
    cPaid.value = paid;
    cPaid.numFmt = currencyNumFmt;
    cPaid.font = { name: fontName, size: 11, bold: true, color: { argb: 'FF047857' } };
    cPaid.alignment = { horizontal: horizontalAlign, vertical: 'middle' };
    registerMoneyWidth(6, paid);

    const cRemaining = row.getCell(7);
    cRemaining.value = {
      formula: `E${r}-F${r}`,
      result: remaining,
    };
    cRemaining.numFmt = currencyNumFmt;
    cRemaining.font = {
      name: fontName,
      size: 11,
      bold: true,
      color: { argb: remaining > 0 ? 'FFB91C1C' : 'FF0F172A' },
    };
    cRemaining.alignment = { horizontal: horizontalAlign, vertical: 'middle' };
    registerMoneyWidth(7, remaining);

    for (let col = 1; col <= 7; col += 1) {
      row.getCell(col).fill = whiteFill;
      row.getCell(col).border = thinBorder;
    }
  });

  // Table 2 Totals Row
  const invTotalRow = sheet.getRow(invTotalRowNum);
  invTotalRow.height = 24;
  const invTotalAmt = Number(sortedInvoices.reduce((acc, i) => acc + (i.amount || 0), 0).toFixed(2));
  const invTotalPaid = Number(
    sortedInvoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0).toFixed(2)
  );
  const invTotalDue = Number(Math.max(0, invTotalAmt - invTotalPaid).toFixed(2));

  invTotalRow.getCell(1).value = totalLabel;
  invTotalRow.getCell(1).font = { name: fontName, size: 11, bold: true, color: { argb: 'FF0F172A' } };
  invTotalRow.getCell(1).alignment = { horizontal: horizontalAlign, vertical: 'middle' };

  invTotalRow.getCell(2).value = '';
  invTotalRow.getCell(3).value = '';
  invTotalRow.getCell(4).value = '';

  invTotalRow.getCell(5).value = hasInvoices
    ? { formula: `SUM(E${invStartRowNum}:E${invEndRowNum})`, result: invTotalAmt }
    : 0;
  invTotalRow.getCell(5).numFmt = currencyNumFmt;
  invTotalRow.getCell(5).font = { name: fontName, size: 11, bold: true, color: { argb: 'FF0F172A' } };
  invTotalRow.getCell(5).alignment = { horizontal: horizontalAlign, vertical: 'middle' };
  registerMoneyWidth(5, invTotalAmt);

  invTotalRow.getCell(6).value = hasInvoices
    ? { formula: `SUM(F${invStartRowNum}:F${invEndRowNum})`, result: invTotalPaid }
    : 0;
  invTotalRow.getCell(6).numFmt = currencyNumFmt;
  invTotalRow.getCell(6).font = { name: fontName, size: 11, bold: true, color: { argb: 'FF047857' } };
  invTotalRow.getCell(6).alignment = { horizontal: horizontalAlign, vertical: 'middle' };
  registerMoneyWidth(6, invTotalPaid);

  invTotalRow.getCell(7).value = hasInvoices
    ? { formula: `SUM(G${invStartRowNum}:G${invEndRowNum})`, result: invTotalDue }
    : 0;
  invTotalRow.getCell(7).numFmt = currencyNumFmt;
  invTotalRow.getCell(7).font = {
    name: fontName,
    size: 11,
    bold: true,
    color: { argb: invTotalDue > 0 ? 'FFB91C1C' : 'FF0F172A' },
  };
  invTotalRow.getCell(7).alignment = { horizontal: horizontalAlign, vertical: 'middle' };
  registerMoneyWidth(7, invTotalDue);

  for (let col = 1; col <= 7; col += 1) {
    invTotalRow.getCell(col).fill = totalFill;
    invTotalRow.getCell(col).border = thinBorder;
  }

  // Auto-fit column widths so no data or currency values are truncated
  colMaxWidths.forEach((width, idx) => {
    sheet.getColumn(idx + 1).width = Math.min(48, Math.max(16, width));
  });

  // Generate & download/share .xlsx file
  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer);

  const safeSupplierSlug = singleSupplier
    ? `_${singleSupplier.name.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]+/g, '_')}`
    : '';
  const fileName = `AL_EQFAL_Suppliers${safeSupplierSlug}_${lang.toUpperCase()}_${getTodayStamp()}.xlsx`;

  await saveOrShareExportFile({
    fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    bytes,
    shareTitle: t.exportExcel,
  });
}

export async function exportSuppliersToPdf(params: {
  suppliers: SupplierWithStats[];
  invoices: PurchaseInvoice[];
  allSuppliersMap: Map<string, Supplier>;
  stats: DashboardStats;
  lang: Language;
  managerEmail?: string | null;
  singleSupplier?: SupplierWithStats | null;
}): Promise<void> {
  const { suppliers, invoices, allSuppliersMap, stats, lang, managerEmail, singleSupplier } = params;
  const t = translations[lang];
  const isRtl = lang === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';
  const textAlign = isRtl ? 'right' : 'left';
  const fontFamily = isRtl
    ? '"IBM Plex Sans Arabic", "Plus Jakarta Sans", system-ui, sans-serif'
    : '"Plus Jakarta Sans", "IBM Plex Sans Arabic", system-ui, sans-serif';

  const targetSuppliers = singleSupplier ? [singleSupplier] : suppliers;
  const targetInvoices = singleSupplier
    ? invoices.filter((inv) => inv.supplierId === singleSupplier.id)
    : invoices;

  const summaryStats: DashboardStats = singleSupplier
    ? {
        suppliersCount: 1,
        invoicesCount: singleSupplier.invoiceCount,
        totalPurchases: singleSupplier.totalPurchases,
        totalPayments: singleSupplier.totalPayments,
        totalPayables: singleSupplier.totalDue,
      }
    : stats;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-12000px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.padding = '36px 40px';
  container.style.fontFamily = fontFamily;
  container.style.direction = dir;
  container.style.boxSizing = 'border-box';

  const reportHeadline = singleSupplier
    ? `${escapeHtml(t.reportSupplierStatement)}: ${escapeHtml(singleSupplier.name)}`
    : escapeHtml(t.reportTitle);

  const suppliersTableRows = targetSuppliers
    .map(
      (s, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom:1px solid #e2e8f0;">
        <td style="padding:9px 10px; font-weight:600; color:#0f172a; text-align:${textAlign};">${escapeHtml(s.name)}</td>
        <td style="padding:9px 10px; font-family:'IBM Plex Mono', monospace; color:#334155; text-align:${textAlign};">${escapeHtml(s.taxNumber)}</td>
        <td style="padding:9px 10px; font-family:'IBM Plex Mono', monospace; color:#0f172a; text-align:center;">${s.invoiceCount}</td>
        <td style="padding:9px 10px; font-family:'IBM Plex Mono', monospace; color:#0f172a; text-align:${textAlign};">${escapeHtml(formatCurrency(s.totalPurchases, lang))}</td>
        <td style="padding:9px 10px; font-family:'IBM Plex Mono', monospace; color:#047857; text-align:${textAlign};">${escapeHtml(formatCurrency(s.totalPayments, lang))}</td>
        <td style="padding:9px 10px; font-family:'IBM Plex Mono', monospace; color:${s.totalDue > 0 ? '#b91c1c' : '#0f172a'}; font-weight:600; text-align:${textAlign};">${escapeHtml(formatCurrency(s.totalDue, lang))}</td>
      </tr>
    `
    )
    .join('');

  const invoiceTableRows = targetInvoices
    .map((inv, idx) => {
      const sup = allSuppliersMap.get(inv.supplierId);
      const remaining = Math.max(0, inv.amount - inv.paidAmount);
      return `
      <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom:1px solid #e2e8f0;">
        <td style="padding:8px 10px; font-family:'IBM Plex Mono', monospace; font-weight:600; color:#0f172a; text-align:${textAlign};">${escapeHtml(inv.invoiceNumber)}</td>
        <td style="padding:8px 10px; font-family:'IBM Plex Mono', monospace; color:#475569; text-align:${textAlign};">${escapeHtml(inv.date)}</td>
        <td style="padding:8px 10px; color:#0f172a; text-align:${textAlign};">${escapeHtml(sup?.name || '-')}</td>
        <td style="padding:8px 10px; font-family:'IBM Plex Mono', monospace; color:#475569; text-align:${textAlign};">${escapeHtml(sup?.taxNumber || '-')}</td>
        <td style="padding:8px 10px; font-family:'IBM Plex Mono', monospace; color:#0f172a; text-align:${textAlign};">${escapeHtml(formatCurrency(inv.amount, lang))}</td>
        <td style="padding:8px 10px; font-family:'IBM Plex Mono', monospace; color:#047857; text-align:${textAlign};">${escapeHtml(formatCurrency(inv.paidAmount, lang))}</td>
        <td style="padding:8px 10px; font-family:'IBM Plex Mono', monospace; color:${remaining > 0 ? '#b91c1c' : '#0f172a'}; text-align:${textAlign};">${escapeHtml(formatCurrency(remaining, lang))}</td>
      </tr>
    `;
    })
    .join('');

  container.innerHTML = `
    <div style="border-bottom:2px solid #0f172a; padding-bottom:16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <div style="font-size:20px; font-weight:700; color:#0f172a; margin-bottom:4px;">${reportHeadline}</div>
        <div style="font-size:12px; color:#475569;">${escapeHtml(t.sectionSubtitle)}</div>
      </div>
      <div style="text-align:${isRtl ? 'left' : 'right'}; font-size:11px; color:#475569; line-height:1.6;">
        <div><strong>${escapeHtml(t.reportGeneratedOn)}:</strong> ${escapeHtml(getTodayStamp())}</div>
        ${managerEmail ? `<div><strong>${escapeHtml(t.reportPreparedBy)}:</strong> ${escapeHtml(managerEmail)}</div>` : ''}
      </div>
    </div>

    <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:10px; margin-bottom:24px;">
      <div style="border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; background:#f8fafc;">
        <div style="font-size:10px; color:#64748b; margin-bottom:4px;">${escapeHtml(t.kpiSuppliersCount)}</div>
        <div style="font-size:16px; font-weight:700; color:#0f172a;">${summaryStats.suppliersCount}</div>
      </div>
      <div style="border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; background:#f8fafc;">
        <div style="font-size:10px; color:#64748b; margin-bottom:4px;">${escapeHtml(t.kpiInvoicesCount)}</div>
        <div style="font-size:16px; font-weight:700; color:#0f172a;">${summaryStats.invoicesCount}</div>
      </div>
      <div style="border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; background:#f8fafc;">
        <div style="font-size:10px; color:#64748b; margin-bottom:4px;">${escapeHtml(t.kpiTotalPurchases)}</div>
        <div style="font-size:13px; font-weight:700; color:#0f172a;">${escapeHtml(formatCurrency(summaryStats.totalPurchases, lang))}</div>
      </div>
      <div style="border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; background:#f8fafc;">
        <div style="font-size:10px; color:#64748b; margin-bottom:4px;">${escapeHtml(t.kpiTotalPayments)}</div>
        <div style="font-size:13px; font-weight:700; color:#047857;">${escapeHtml(formatCurrency(summaryStats.totalPayments, lang))}</div>
      </div>
      <div style="border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; background:#f8fafc;">
        <div style="font-size:10px; color:#64748b; margin-bottom:4px;">${escapeHtml(t.kpiTotalPayables)}</div>
        <div style="font-size:13px; font-weight:700; color:#b91c1c;">${escapeHtml(formatCurrency(summaryStats.totalPayables, lang))}</div>
      </div>
    </div>

    <div style="margin-bottom:24px;">
      <h2 style="font-size:14px; font-weight:700; color:#0f172a; margin:0 0 10px 0;">${escapeHtml(t.allSuppliersTitle)}</h2>
      <table style="width:100%; border-collapse:collapse; font-size:11px; border:1px solid #cbd5e1;">
        <thead>
          <tr style="background:#f1f5f9; border-bottom:1px solid #cbd5e1; color:#334155;">
            <th style="padding:8px 10px; text-align:${textAlign};">${escapeHtml(t.colSupplierName)}</th>
            <th style="padding:8px 10px; text-align:${textAlign};">${escapeHtml(t.colTaxNumber)}</th>
            <th style="padding:8px 10px; text-align:center;">${escapeHtml(t.colInvoicesCount)}</th>
            <th style="padding:8px 10px; text-align:${textAlign};">${escapeHtml(t.colTotalPurchases)}</th>
            <th style="padding:8px 10px; text-align:${textAlign};">${escapeHtml(t.colTotalPayments)}</th>
            <th style="padding:8px 10px; text-align:${textAlign};">${escapeHtml(t.colTotalDue)}</th>
          </tr>
        </thead>
        <tbody>
          ${
            suppliersTableRows ||
            `<tr><td colspan="6" style="padding:14px; text-align:center; color:#64748b;">-</td></tr>`
          }
        </tbody>
      </table>
    </div>

    <div>
      <h2 style="font-size:14px; font-weight:700; color:#0f172a; margin:0 0 10px 0;">${escapeHtml(t.allInvoicesTitle)}</h2>
      <table style="width:100%; border-collapse:collapse; font-size:10.5px; border:1px solid #cbd5e1;">
        <thead>
          <tr style="background:#f1f5f9; border-bottom:1px solid #cbd5e1; color:#334155;">
            <th style="padding:8px 10px; text-align:${textAlign};">${escapeHtml(t.colInvoiceNumber)}</th>
            <th style="padding:8px 10px; text-align:${textAlign};">${escapeHtml(t.colDate)}</th>
            <th style="padding:8px 10px; text-align:${textAlign};">${escapeHtml(t.colSupplierName)}</th>
            <th style="padding:8px 10px; text-align:${textAlign};">${escapeHtml(t.colTaxNumber)}</th>
            <th style="padding:8px 10px; text-align:${textAlign};">${escapeHtml(t.colAmount)}</th>
            <th style="padding:8px 10px; text-align:${textAlign};">${escapeHtml(t.colPaid)}</th>
            <th style="padding:8px 10px; text-align:${textAlign};">${escapeHtml(t.colRemaining)}</th>
          </tr>
        </thead>
        <tbody>
          ${
            invoiceTableRows ||
            `<tr><td colspan="7" style="padding:14px; text-align:center; color:#64748b;">-</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;

  document.body.appendChild(container);

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const safeSupplierSlug = singleSupplier
      ? `_${singleSupplier.name.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]+/g, '_')}`
      : '';
    const fileName = `AL_EQFAL_Suppliers${safeSupplierSlug}_${lang.toUpperCase()}_${getTodayStamp()}.pdf`;
    const arrayBuffer = pdf.output('arraybuffer');
    await saveOrShareExportFile({
      fileName,
      mimeType: 'application/pdf',
      bytes: new Uint8Array(arrayBuffer),
      shareTitle: t.exportPdf,
    });
  } finally {
    document.body.removeChild(container);
  }
}
