const express = require('express');
const { effectiveStatus } = require('../services/invoiceService');

module.exports = function dashboardRoutes(storage) {
  const router = express.Router();
  router.get('/stats', async (req,res,next)=>{
    try {
      const invoices=await storage.read('invoices');
      const currency=String(req.query.currency||'INR').toUpperCase();
      const selected=invoices.filter(i=>i.currency===currency);
      const today=new Date().toISOString().slice(0,10);
      const paid=selected.filter(i=>i.status==='Paid');
      const pending=selected.filter(i=>effectiveStatus(i)==='Pending');
      const overdue=selected.filter(i=>effectiveStatus(i)==='Overdue');
      res.json({success:true,data:{
        totalInvoices:invoices.length,
        currency,
        paidRevenue:paid.reduce((s,i)=>s+Number(i.total||0),0),
        pendingAmount:pending.reduce((s,i)=>s+Number(i.total||0),0),
        overdueCount:overdue.length,
        overdueAmount:overdue.reduce((s,i)=>s+Number(i.total||0),0),
        recent:invoices.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,6).map(i=>({...i,displayStatus:effectiveStatus(i)}))
      }});
    }catch(e){next(e);}
  });
  router.get('/revenue', async(req,res,next)=>{
    try{
      const invoices=await storage.read('invoices');const currency=String(req.query.currency||'INR').toUpperCase();
      const months=Math.min(12,Math.max(1,Number(req.query.months)||6));const now=new Date();
      const buckets=[];
      for(let n=months-1;n>=0;n--){const d=new Date(now.getFullYear(),now.getMonth()-n,1);buckets.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:d.toLocaleString('en',{month:'short'}),revenue:0});}
      for(const i of invoices){if(i.status!=='Paid'||i.currency!==currency)continue;const date=i.paidAt||String(i.updatedAt||'').slice(0,10);const key=date.slice(0,7);const b=buckets.find(x=>x.key===key);if(b)b.revenue+=Number(i.total||0);}
      res.json({success:true,data:buckets});
    }catch(e){next(e);}
  });
  return router;
};
