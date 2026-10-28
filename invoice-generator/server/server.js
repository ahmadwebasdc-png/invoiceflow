require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const helmet = require('helmet');
const { createStorage } = require('./services/storageService');
const invoiceRoutes = require('./routes/invoices');
const clientRoutes = require('./routes/clients');
const dashboardRoutes = require('./routes/dashboard');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const port = Number(process.env.PORT) || 3000;
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname,'data'));
const storage = createStorage(dataDir);

app.disable('x-powered-by');
app.use(cors({
  origin: 'https://invoiceflow-two-rho.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1.5mb' }));
app.get('/api/health', async (req,res,next) => {
  try { await storage.ensure(); res.json({success:true,data:{status:'ok',storage:'persistent-json'}}); } catch(e){next(e);}
});
app.use('/api/invoices', invoiceRoutes(storage));
app.use('/api/clients', clientRoutes(storage));
app.use('/api/dashboard', dashboardRoutes(storage));
app.get('/api/settings', async(req,res,next)=>{try{res.json({success:true,data:await storage.read('settings')});}catch(e){next(e);}});
app.put('/api/settings', async(req,res,next)=>{try{const settings=req.body||{};await storage.write('settings',settings);res.json({success:true,data:settings,message:'Settings saved.'});}catch(e){next(e);}});
app.use(express.static(path.join(__dirname,'..','public')));
app.use('/api', notFound);
app.use(errorHandler);

storage.ensure().then(()=>{
  app.listen(port,()=>console.log(`Invoice Generator running at http://localhost:${port} (persistent JSON storage: ${dataDir})`));
}).catch(err=>{console.error('Storage initialization failed:',err.message);process.exit(1);});

module.exports = app;
