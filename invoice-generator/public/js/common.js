const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const money = (amount, currency='INR') => {
  try { return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:2}).format(Number(amount)||0); }
  catch { return `${currency} ${(Number(amount)||0).toFixed(2)}`; }
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function toast(message, type='success') {
  let region = $('.toast-region');
  if (!region) { region=document.createElement('div');region.className='toast-region';region.setAttribute('aria-live','polite');document.body.append(region); }
  const node=document.createElement('div');node.className=`toast ${type==='error'?'error':''}`;node.textContent=message;region.append(node);
  setTimeout(()=>node.remove(),3800);
}
function statusBadge(status){return `<span class="status ${esc(status)}">${esc(status)}</span>`;}
function emptyState(title, text, action='') { return `<div class="empty-state"><div class="empty-icon"><i data-lucide="file-text"></i></div><h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`; }
function initIcons(){ if(window.lucide) lucide.createIcons(); }
function initSidebar(){
  const menu=$('.mobile-menu'), sidebar=$('.sidebar');
  menu?.addEventListener('click',()=>sidebar?.classList.toggle('open'));
  document.addEventListener('click',e=>{if(window.innerWidth<=760 && sidebar?.classList.contains('open') && !sidebar.contains(e.target) && !menu?.contains(e.target)) sidebar.classList.remove('open');});
}
function appLayout(title, content, active='dashboard'){
  const nav=[['dashboard','layout-dashboard','Overview','dashboard.html'],['invoices','files','All Invoices','invoices.html'],['create','file-plus-2','Create Invoice','create-invoice.html'],['clients','users','Clients','clients.html'],['reports','chart-no-axes-combined','Reports','reports.html'],['settings','settings','Settings','settings.html']];
  document.body.innerHTML=`<div class="app-shell"><aside class="sidebar"><a class="brand" href="index.html"><img src="/images/invoiceflow-logo.png" alt="InvoiceFlow Logo" class="brand-logo"></a><div><div class="side-label">Workspace</div><nav class="side-nav">${nav.map(([id,icon,label,href])=>`<a class="${active===id?'active':''}" href="${href}"><i data-lucide="${icon}"></i>${label}</a>`).join('')}</nav></div><div class="sidebar-bottom"><strong>Local workspace</strong><p class="muted" style="font-size:12px;margin:5px 0 0">Your data is stored on this computer's server.</p></div></aside><main class="main"><header class="topbar"><div class="topbar-left"><button class="icon-btn mobile-menu" aria-label="Open menu"><i data-lucide="menu"></i></button><div><strong>${esc(title)}</strong><div class="muted" style="font-size:11px">Workspace / ${esc(title)}</div></div></div><a class="btn btn-primary btn-small" href="create-invoice.html"><i data-lucide="plus"></i> Create Invoice</a></header><section class="page-wrap">${content}</section></main></div>`;
  initSidebar();initIcons();
}
function fmtDate(date){if(!date)return '—';const d=new Date(`${date}T00:00:00`);return Number.isNaN(d.getTime())?date:d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}
async function downloadInvoicePdf(invoice) {
  const paper=buildInvoicePaper(invoice);
  const wrap=document.createElement('div');wrap.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:white;';wrap.append(paper);document.body.append(wrap);
  try {
    if(!window.html2pdf) throw new Error('PDF library did not load. Check your internet connection and retry.');
    await html2pdf().set({margin:[8,8,8,8],filename:`${invoice.invoiceNumber || 'invoice'}.pdf`,image:{type:'jpeg',quality:.98},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from(paper).save();
  } finally { wrap.remove(); }
}
function buildInvoicePaper(i){
  const paper=document.createElement('article');paper.className='invoice-paper';paper.style.maxWidth='none';paper.style.boxShadow='none';
  const b=i.business||{},c=i.client||{},items=i.items||[];
  paper.innerHTML=`<div style="display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #2563eb;padding-bottom:20px"><div>${b.logoData?`<img src="${esc(b.logoData)}" alt="Business logo" style="max-width:100px;max-height:70px;object-fit:contain">`:''}<h2 style="margin:0">${esc(b.name||'Your Business')}</h2><p style="white-space:pre-line;color:#64748b">${esc(b.address||'')}${b.email?'<br>'+esc(b.email):''}${b.phone?'<br>'+esc(b.phone):''}${b.taxId?'<br>Tax ID: '+esc(b.taxId):''}</p></div><div style="text-align:right"><h1 style="margin:0;color:#2563eb">INVOICE</h1><strong>${esc(i.invoiceNumber||'Draft preview')}</strong><p>Issued: ${esc(fmtDate(i.invoiceDate))}<br>Due: ${esc(fmtDate(i.dueDate))}<br>Status: ${esc(i.displayStatus||i.status||'Draft')}</p></div></div><div style="margin:24px 0"><span style="color:#64748b;font-size:11px;font-weight:bold">BILL TO</span><h3 style="margin:4px 0">${esc(c.name||'Client name')}</h3><p style="white-space:pre-line;color:#64748b">${esc(c.address||'')}${c.email?'<br>'+esc(c.email):''}${c.phone?'<br>'+esc(c.phone):''}${c.taxId?'<br>Tax ID: '+esc(c.taxId):''}</p></div><table style="white-space:normal"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Tax</th><th style="text-align:right">Amount</th></tr></thead><tbody>${items.map(it=>`<tr><td>${esc(it.description)}</td><td>${esc(it.quantity)}</td><td>${money(it.unitPrice,i.currency)}</td><td>${esc(it.taxRate)}%</td><td style="text-align:right">${money(it.total,i.currency)}</td></tr>`).join('')}</tbody></table><div style="width:min(320px,100%);margin:20px 0 20px auto">${[['Subtotal',i.subtotal],['Item discounts',-(i.itemDiscounts||0)],['Tax',i.taxTotal],['Invoice discount',-(i.invoiceDiscount||0)]].map(([label,val])=>`<div style="display:flex;justify-content:space-between;padding:5px 0;color:#475569"><span>${label}</span><span>${money(val,i.currency)}</span></div>`).join('')}<div style="background:#eff6ff;padding:15px;border-radius:8px;display:flex;justify-content:space-between;font-weight:bold;font-size:18px"><span>Total</span><span>${money(i.total,i.currency)}</span></div></div>${i.paymentInstructions?`<h4>Payment instructions</h4><p style="white-space:pre-line">${esc(i.paymentInstructions)}</p>`:''}${i.notes?`<h4>Notes</h4><p style="white-space:pre-line">${esc(i.notes)}</p>`:''}${i.terms?`<h4>Terms & conditions</h4><p style="white-space:pre-line">${esc(i.terms)}</p>`:''}<p style="text-align:center;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:30px;font-size:11px">Thank you for your business.</p>`;
  return paper;
}
