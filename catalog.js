/* Double Eagle Financial: service catalog and quote math. */
const DEF = {
  FORM_ENDPOINT: 'https://formspree.io/f/xljrovea',
  EMAIL: 'hello@doubleeaglefinancial.com',
  CART_KEY: 'def-cart-v1',
  TAX_RATE: 0,          // MS: accounting/bookkeeping is a non-taxable professional service (35 Miss. Code R. 4-05-06-202)
  CARD_FEE_RATE: 0.03,  // 3% card processing fee passed through; ACH/check = $0
  PREPAY_DISCOUNT: [],
  catalog: [
    {code:'PLAN-STR', name:'Starter Bookkeeping (monthly)', cat:'Monthly Plan', price:300, unit:'month', desc:'Up to ~75 transactions/mo. Owner-operators, one crew. Weekly categorization, job/class tracking, all accounts reconciled, P&L / P&L by Job / Balance Sheet, books done by the 5th.'},
    {code:'PLAN-GRW', name:'Standard Bookkeeping (monthly)', cat:'Monthly Plan', price:500, unit:'month', desc:'~76–125 transactions/mo. Small shops running several jobs. Weekly categorization, job/class tracking, all accounts reconciled, P&L / P&L by Job / Balance Sheet, books done by the 5th.'},
    {code:'PLAN-PRM', name:'Plus Bookkeeping (monthly)', cat:'Monthly Plan', price:800, unit:'month', desc:'~126–200 transactions/mo. Multiple crews and cards. Weekly categorization, job/class tracking, all accounts reconciled, P&L / P&L by Job / Balance Sheet, books done by the 5th.'},
    {code:'ADD-CATCH', name:'Catch-up / Cleanup', cat:'Cleanup & Setup', price:500, unit:'catch-up (minimum)', desc:'From $500. Quoted as monthly price × months behind × 1.0, 1.25, or 1.5, or $4 × transactions, whichever is higher. Paid upfront.'},
    {code:'ADD-QBO', name:'QuickBooks Online Setup', cat:'Cleanup & Setup', price:299, unit:'setup', desc:'Chart of accounts, bank feeds, rules, and opening balances.'},
    {code:'ADD-PAYSET', name:'Payroll Setup', cat:'Payroll', price:199, unit:'setup', desc:'Payroll provider setup, employee onboarding, state and federal accounts.'},
    {code:'ADD-PAYRUN', name:'Payroll Processing', cat:'Payroll', price:60, unit:'month', desc:'Up to 10 employees per month.'},
    {code:'TAX-BIZ', name:'Business Tax Return Prep', cat:'Tax', price:595, unit:'return', desc:'Schedule C, 1065, or 1120-S preparation.'},
    {code:'TAX-IND', name:'Individual Tax Return (1040)', cat:'Tax', price:225, unit:'return', desc:'Owner personal return.'},
    {code:'TAX-1099', name:'1099 Filing', cat:'Tax', price:15, unit:'form', desc:'1099-NEC / 1099-MISC prepared and e-filed.'}
  ],
  byCode(c){ return this.catalog.find(x=>x.code===c); },
  r2(n){ return Math.round((n+Number.EPSILON)*100)/100; },
  money(n){ return '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); },
  discountRate(item, qty){ return 0; },
  /* cart: [{code, qty}], payment: 'ACH'|'Card' */
  bill(cart, payment){
    const lines = cart.filter(l=>l.qty>0).map(l=>{
      const it=this.byCode(l.code), qty=Math.floor(l.qty);
      const gross=this.r2(it.price*qty), rate=this.discountRate(it,qty), disc=this.r2(gross*rate);
      return {code:it.code, name:it.name, cat:it.cat, qty, unitPrice:it.price, lineSubtotal:gross, discountRate:rate, discount:disc, net:this.r2(gross-disc)};
    });
    const subtotal=this.r2(lines.reduce((s,l)=>s+l.lineSubtotal,0));
    const discount=this.r2(lines.reduce((s,l)=>s+l.discount,0));
    const netRevenue=this.r2(subtotal-discount);
    const tax=this.r2(netRevenue*this.TAX_RATE);
    const fee=payment==='Card'?this.r2((netRevenue+tax)*this.CARD_FEE_RATE):0;
    const total=this.r2(netRevenue+tax+fee);
    return {lines, subtotal, discount, netRevenue, tax, fee, total};
  }
};
