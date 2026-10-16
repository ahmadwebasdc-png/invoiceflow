const express = require('express');
const { normalizeInvoice, effectiveStatus } = require('../services/invoiceService');

module.exports = function invoiceRoutes(storage) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      let rows = await storage.read('invoices');
      const q = String(req.query.q || '').toLowerCase();
      const status = String(req.query.status || '');
      if (q) rows = rows.filter(x => `${x.invoiceNumber} ${x.client?.name || ''} ${x.client?.email || ''}`.toLowerCase().includes(q));
      if (status) rows = rows.filter(x => effectiveStatus(x) === status);
      const allowedSort = ['invoiceDate','dueDate','total','invoiceNumber','updatedAt'];
      const sort = allowedSort.includes(req.query.sort) ? req.query.sort : 'updatedAt';
      const dir = req.query.dir === 'asc' ? 1 : -1;
      rows.sort((a,b) => (a[sort] > b[sort] ? 1 : a[sort] < b[sort] ? -1 : 0) * dir);
      const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10) || 20));
      res.json({ success: true, data: rows.slice((page-1)*limit, page*limit).map(x => ({...x, displayStatus: effectiveStatus(x)})), meta: { total: rows.length, page, limit, pages: Math.max(1, Math.ceil(rows.length/limit)) } });
    } catch (e) { next(e); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const rows = await storage.read('invoices');
      const invoice = normalizeInvoice(req.body, rows);
      rows.push(invoice); await storage.write('invoices', rows);
      res.status(201).json({ success: true, data: invoice, message: 'Invoice saved.' });
    } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const row = (await storage.read('invoices')).find(x => x.id === req.params.id);
      if (!row) return res.status(404).json({ success: false, message: 'Invoice not found.' });
      res.json({ success: true, data: { ...row, displayStatus: effectiveStatus(row) } });
    } catch (e) { next(e); }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const rows = await storage.read('invoices');
      const index = rows.findIndex(x => x.id === req.params.id);
      if (index < 0) return res.status(404).json({ success: false, message: 'Invoice not found.' });
      const updated = normalizeInvoice(req.body, rows, rows[index]);
      rows[index] = updated; await storage.write('invoices', rows);
      res.json({ success: true, data: updated, message: 'Invoice updated.' });
    } catch (e) { next(e); }
  });

  router.patch('/:id/status', async (req, res, next) => {
    try {
      const rows = await storage.read('invoices');
      const row = rows.find(x => x.id === req.params.id);
      if (!row) return res.status(404).json({ success: false, message: 'Invoice not found.' });
      if (!['Draft','Pending','Paid'].includes(req.body.status)) return res.status(422).json({ success:false, message:'Status must be Draft, Pending, or Paid.' });
      row.status = req.body.status;
      row.paidAt = row.status === 'Paid' ? (req.body.paidAt || new Date().toISOString().slice(0,10)) : null;
      row.updatedAt = new Date().toISOString();
      await storage.write('invoices', rows);
      res.json({ success:true, data:{...row, displayStatus:effectiveStatus(row)}, message:'Status updated.' });
    } catch (e) { next(e); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const rows = await storage.read('invoices');
      const filtered = rows.filter(x => x.id !== req.params.id);
      if (filtered.length === rows.length) return res.status(404).json({ success:false, message:'Invoice not found.' });
      await storage.write('invoices', filtered);
      res.status(204).end();
    } catch (e) { next(e); }
  });
  return router;
};
