const express = require('express');
const crypto = require('node:crypto');

module.exports = function clientRoutes(storage) {
  const router = express.Router();
  router.get('/', async (req,res,next) => {
    try {
      let rows = await storage.read('clients');
      const q = String(req.query.q || '').toLowerCase();
      if (q) rows = rows.filter(c => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q));
      const invoices = await storage.read('invoices');
      rows = rows.map(c => ({...c, invoiceCount: invoices.filter(i => i.clientId === c.id || i.client?.email === c.email).length}));
      res.json({success:true,data:rows});
    } catch(e){next(e);}
  });
  router.post('/', async (req,res,next) => {
    try {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(422).json({success:false,message:'Client name is required.'});
      const rows = await storage.read('clients');
      const client = {id:crypto.randomUUID(),name,email:String(req.body.email||'').trim(),phone:String(req.body.phone||'').trim(),address:String(req.body.address||'').trim(),taxId:String(req.body.taxId||'').trim(),createdAt:new Date().toISOString()};
      rows.push(client); await storage.write('clients',rows);
      res.status(201).json({success:true,data:client,message:'Client added.'});
    }catch(e){next(e);}
  });
  router.get('/:id', async(req,res,next)=>{
    try{const c=(await storage.read('clients')).find(x=>x.id===req.params.id); if(!c)return res.status(404).json({success:false,message:'Client not found.'});res.json({success:true,data:c});}catch(e){next(e);}
  });
  router.put('/:id', async(req,res,next)=>{
    try{
      const rows=await storage.read('clients');const i=rows.findIndex(x=>x.id===req.params.id);
      if(i<0)return res.status(404).json({success:false,message:'Client not found.'});
      const name=String(req.body.name||'').trim();if(!name)return res.status(422).json({success:false,message:'Client name is required.'});
      rows[i]={...rows[i],name,email:String(req.body.email||'').trim(),phone:String(req.body.phone||'').trim(),address:String(req.body.address||'').trim(),taxId:String(req.body.taxId||'').trim(),updatedAt:new Date().toISOString()};
      await storage.write('clients',rows);res.json({success:true,data:rows[i],message:'Client updated.'});
    }catch(e){next(e);}
  });
  router.delete('/:id', async(req,res,next)=>{
    try{
      const rows=await storage.read('clients');const client=rows.find(x=>x.id===req.params.id);
      if(!client)return res.status(404).json({success:false,message:'Client not found.'});
      const invoices=await storage.read('invoices');
      if(invoices.some(i=>i.clientId===client.id))return res.status(409).json({success:false,message:'This client is linked to invoices. Keep the client record to preserve history.'});
      await storage.write('clients',rows.filter(x=>x.id!==req.params.id));res.status(204).end();
    }catch(e){next(e);}
  });
  return router;
};
