const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateInvoice } = require('../server/services/invoiceService');

test('calculates one taxable item', () => {
  const r = calculateInvoice({currency:'INR',items:[{description:'Work',quantity:2,unitPrice:100,taxRate:18}]});
  assert.equal(r.subtotal,200); assert.equal(r.taxTotal,36); assert.equal(r.total,236);
});
test('applies item and invoice discounts consistently', () => {
  const r = calculateInvoice({currency:'INR',invoiceDiscountType:'fixed',invoiceDiscount:10,items:[{description:'Work',quantity:1,unitPrice:100,taxRate:10,discount:20}]});
  assert.equal(r.itemDiscounts,20); assert.equal(r.taxTotal,8); assert.equal(r.total,78);
});
test('rejects empty items and negative price', () => {
  assert.throws(()=>calculateInvoice({items:[]}),/at least one/);
  assert.throws(()=>calculateInvoice({items:[{description:'Bad',quantity:1,unitPrice:-1}]}),/unit price/);
});
test('percentage discount is capped at 100 percent', () => {
  const r=calculateInvoice({invoiceDiscountType:'percent',invoiceDiscount:120,items:[{description:'Work',quantity:1,unitPrice:100,taxRate:0}]});
  assert.equal(r.total,0);
});
