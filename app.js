let cart = JSON.parse(localStorage.getItem(DEF.CART_KEY)||'[]');
const $ = id => document.getElementById(id);
const saveCart = () => localStorage.setItem(DEF.CART_KEY, JSON.stringify(cart));
$('txnDate').value = new Date().toISOString().slice(0,10);
$('cards').innerHTML = DEF.catalog.map(it => `<div class="card"><span class="cat">${it.cat}</span><b>${it.name}</b><span class="price">${DEF.money(it.price)} <small>/ ${it.unit}</small></span><p>${it.desc}</p>
<div><input type="number" min="1" max="24" value="1" id="q-${it.code}" aria-label="Quantity ${it.name}"> <button data-add="${it.code}" aria-label="Add ${it.name}">Add</button></div></div>`).join('');
document.addEventListener('click', e => {
  const a = e.target.dataset.add; if (a) { addItem(a, parseInt($('q-'+a).value)||1); }
  const r = e.target.dataset.rm; if (r) { cart = cart.filter(l => l.code !== r); saveCart(); renderCart(); }
});
function addItem(code, qty){ const ex = cart.find(l=>l.code===code); if (ex) ex.qty += qty; else cart.push({code, qty}); saveCart(); renderCart(); $('msg').textContent=''; }
function setQty(code, qty){ const l = cart.find(x=>x.code===code); if(!l) return; if (qty<=0) cart = cart.filter(x=>x.code!==code); else l.qty = qty; saveCart(); renderCart(); }
function renderCart(){
  const b = DEF.bill(cart, $('payment').value);
  $('cartTable').querySelector('tbody').innerHTML = cart.length ? cart.map(l=>{const it=DEF.byCode(l.code);return `<tr><td>${it.name}</td><td>${it.cat}</td><td class="n">${DEF.money(it.price)}</td><td><input type="number" min="0" value="${l.qty}" onchange="setQty('${l.code}',parseInt(this.value)||0)" aria-label="Change qty ${it.name}"></td><td class="n">${DEF.money(it.price*l.qty)}</td><td><button class="sec" data-rm="${l.code}">Remove</button></td></tr>`}).join('') + `<tr class="tot"><td colspan="4">Estimated total (see quote for discounts and fees)</td><td class="n">${DEF.money(b.total)}</td><td></td></tr>` : '<tr><td colspan="6">No services selected yet.</td></tr>';
  $('review').disabled = !cart.length;
}
function billHTML(t){
  return `<p><b>Double Eagle Financial LLC</b> · Olive Branch, MS 38654<br>Quote estimate · Start date ${t.date} · ${esc(t.customerName||'')} · ${t.industry} · Payment: ${t.payment}</p>
<table><thead><tr><th>Service</th><th class="n">Qty</th><th class="n">Unit price</th><th class="n">Line subtotal</th><th class="n">Discount</th><th class="n">Net</th></tr></thead><tbody>
${t.lines.map(l=>`<tr><td>${l.name}</td><td class="n">${l.qty}</td><td class="n">${DEF.money(l.unitPrice)}</td><td class="n">${DEF.money(l.lineSubtotal)}</td><td class="n">${l.discount?'-'+DEF.money(l.discount)+' ('+(l.discountRate*100)+'%)':'None'}</td><td class="n">${DEF.money(l.net)}</td></tr>`).join('')}
<tr><td colspan="5">Subtotal</td><td class="n">${DEF.money(t.subtotal)}</td></tr><tr><td colspan="5">Prepay discount</td><td class="n">-${DEF.money(t.discount)}</td></tr>
<tr><td colspan="5">Net service revenue</td><td class="n">${DEF.money(t.netRevenue)}</td></tr><tr><td colspan="5">Sales tax (0%, MS professional services)</td><td class="n">${DEF.money(t.tax)}</td></tr>
<tr><td colspan="5">Card processing fee (3% if card)</td><td class="n">${DEF.money(t.fee)}</td></tr><tr class="tot"><td colspan="5">ESTIMATED TOTAL</td><td class="n" id="billTotal">${DEF.money(t.total)}</td></tr></tbody></table>`;
}
let draft = null;
function makeDraft(){ const b = DEF.bill(cart, $('payment').value); return {...b, date:$('txnDate').value, customerName:$('custName').value.trim(), industry:$('industry').value, payment:$('payment').value}; }
$('review').onclick = () => { draft = makeDraft(); $('billBody').innerHTML = billHTML(draft); $('bill').style.display='block'; $('complete').disabled=false; $('sendMsg').textContent=''; $('bill').scrollIntoView(); };
$('edit').onclick = () => { $('bill').style.display='none'; $('cart').scrollIntoView(); };
$('print').onclick = () => window.print();
$('payment').onchange = renderCart;
$('clearCart').onclick = () => { cart=[]; saveCart(); renderCart(); };
function esc(v){ return String(v).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
$('complete').onclick = async () => {
  if (!draft || !draft.lines.length) return;
  const out = $('sendMsg'), email = $('contactEmail').value.trim();
  out.className = 'ok';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { out.className = 'err'; out.textContent = 'Add your email above so I can reply.'; $('contactEmail').focus(); return; }
  if ($('companyWebsite').value) return; // honeypot
  const payload = {
    form_name: 'quote-request', source_page: location.pathname,
    business: draft.customerName, name: $('contactName').value.trim(), email, phone: $('contactPhone').value.trim(),
    industry: draft.industry, payment_preference: draft.payment, preferred_start: draft.date,
    services: draft.lines.map(l => l.name + ' x' + l.qty + ' = ' + DEF.money(l.net)).join('; '),
    estimated_total: DEF.money(draft.total), _subject: 'Quote request: ' + (draft.customerName || email)
  };
  $('complete').disabled = true; out.textContent = 'Sending...';
  try {
    const res = await fetch(DEF.FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    out.textContent = 'Sent. I will reply within one business day.';
    cart = []; saveCart(); renderCart();
  } catch (e) {
    $('complete').disabled = false; out.className = 'err';
    out.innerHTML = 'That did not send. Email <a href="mailto:' + DEF.EMAIL + '">' + DEF.EMAIL + '</a> or call (662) 506-2041.';
  }
};
renderCart();
