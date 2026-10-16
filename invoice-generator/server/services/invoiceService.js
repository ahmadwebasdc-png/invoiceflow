const crypto = require('node:crypto');

const roundMoney = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const validNumber = (n, label, { min = 0, max = 1_000_000_000 } = {}) => {
  const value = Number(n);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return value;
};

function calculateInvoice(input) {
  if (!input || !Array.isArray(input.items) || input.items.length === 0) throw new Error('Add at least one line item.');
  const items = input.items.map((item, index) => {
    const description = String(item.description || '').trim();
    if (!description) throw new Error(`Item ${index + 1}: description is required.`);
    const quantity = validNumber(item.quantity, `Item ${index + 1} quantity`, { min: 0.0001, max: 1_000_000 });
    const unitPrice = validNumber(item.unitPrice, `Item ${index + 1} unit price`);
    const taxRate = validNumber(item.taxRate ?? 0, `Item ${index + 1} tax rate`, { min: 0, max: 100 });
    const discountType = item.discountType === 'percent' ? 'percent' : 'fixed';
    const discountInput = validNumber(item.discount ?? 0, `Item ${index + 1} discount`);
    const gross = roundMoney(quantity * unitPrice);
    const discount = roundMoney(Math.min(gross, discountType === 'percent' ? gross * Math.min(discountInput, 100) / 100 : discountInput));
    const taxable = roundMoney(gross - discount);
    const tax = roundMoney(taxable * taxRate / 100);
    return { description, quantity, unitPrice, taxRate, discountType, discount: discountInput, gross, discountAmount: discount, taxable, tax, total: roundMoney(taxable + tax) };
  });
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.gross, 0));
  const itemDiscounts = roundMoney(items.reduce((sum, item) => sum + item.discountAmount, 0));
  const taxableSubtotal = roundMoney(subtotal - itemDiscounts);
  const taxTotal = roundMoney(items.reduce((sum, item) => sum + item.tax, 0));
  const invoiceDiscountType = input.invoiceDiscountType === 'percent' ? 'percent' : 'fixed';
  const invoiceDiscountInput = validNumber(input.invoiceDiscount ?? 0, 'Invoice discount');
  const invoiceDiscount = roundMoney(Math.min(taxableSubtotal + taxTotal, invoiceDiscountType === 'percent' ? taxableSubtotal * Math.min(invoiceDiscountInput, 100) / 100 : invoiceDiscountInput));
  const total = roundMoney(Math.max(0, taxableSubtotal + taxTotal - invoiceDiscount));
  return { items, subtotal, itemDiscounts, taxableSubtotal, taxTotal, invoiceDiscount, total, currency: String(input.currency || 'INR').toUpperCase() };
}

function invoiceNumber(existing) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const nums = existing.map(x => String(x.invoiceNumber || '')).filter(x => x.startsWith(prefix)).map(x => Number(x.slice(prefix.length))).filter(Number.isFinite);
  return `${prefix}${String(Math.max(0, ...nums) + 1).padStart(4, '0')}`;
}

function normalizeInvoice(input, existing = [], old = null) {
  const calc = calculateInvoice(input);
  const invoiceDate = input.invoiceDate || new Date().toISOString().slice(0, 10);
  const dueDate = input.dueDate || invoiceDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error('Use valid invoice and due dates.');
  if (dueDate < invoiceDate) throw new Error('Due date cannot be earlier than invoice date.');
  const requestedNumber = String(input.invoiceNumber || '').trim();
  const number = old ? old.invoiceNumber : (requestedNumber || invoiceNumber(existing));
  if (existing.some(x => x.invoiceNumber === number && x.id !== old?.id)) throw new Error('Invoice number already exists.');
  const statusIn = String(input.status || old?.status || 'Pending');
  const status = ['Draft', 'Pending', 'Paid'].includes(statusIn) ? statusIn : 'Pending';
  const now = new Date().toISOString();
  return {
    ...(old || {}),
    id: old?.id || crypto.randomUUID(),
    invoiceNumber: number,
    business: cleanObject(input.business, ['name','address','email','phone','taxId','logoData']),
    client: cleanObject(input.client, ['name','email','address','phone','taxId']),
    invoiceDate, dueDate, currency: calc.currency,
    paymentTerms: String(input.paymentTerms || 'Due on receipt'),
    reference: String(input.reference || ''),
    items: calc.items,
    invoiceDiscountType: input.invoiceDiscountType === 'percent' ? 'percent' : 'fixed',
    invoiceDiscount: Number(input.invoiceDiscount || 0),
    notes: String(input.notes || ''),
    paymentInstructions: String(input.paymentInstructions || ''),
    terms: String(input.terms || ''),
    status,
    paidAt: status === 'Paid' ? (input.paidAt || old?.paidAt || now.slice(0,10)) : null,
    ...calc,
    createdAt: old?.createdAt || now,
    updatedAt: now
  };
}

function cleanObject(obj, fields) {
  const source = obj && typeof obj === 'object' ? obj : {};
  return Object.fromEntries(fields.map(k => [k, String(source[k] || '').trim().slice(0, k === 'logoData' ? 1_000_000 : 2000)]));
}

function effectiveStatus(invoice) {
  if (invoice.status === 'Paid' || invoice.status === 'Draft') return invoice.status;
  return invoice.dueDate < new Date().toISOString().slice(0, 10) ? 'Overdue' : 'Pending';
}

module.exports = { calculateInvoice, normalizeInvoice, invoiceNumber, effectiveStatus, roundMoney };
