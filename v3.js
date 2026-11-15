/* v3 features: pricing toggle, plan pick, savings calculator, sticky CTA, theme toggle, timeline. Uses addItem() from app.js. */
(function(){
var d=document,$=function(i){return d.getElementById(i)},fmt=function(n){return '$'+Math.round(n).toLocaleString('en-US')};
var yearly=false;
function setBill(y){yearly=y;d.querySelectorAll('.tg').forEach(function(b){var on=(b.dataset.bill==='y')===y;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});
 d.querySelectorAll('.pp').forEach(function(p){var m=+p.dataset.m;p.querySelector('b').textContent=fmt(y?m*0.9:m);p.nextElementSibling.textContent='Billed monthly';});}
d.querySelectorAll('.tg').forEach(function(b){b.addEventListener('click',function(){setBill(b.dataset.bill==='y');});});
function pick(code){var q=1;if(typeof addItem==='function'){addItem(code,q);var it=DEF.byCode(code);$('pickMsg').textContent='Added '+it.name+' × '+q+' to Your Selections.';}}
d.querySelectorAll('.pick').forEach(function(b){b.addEventListener('click',function(){pick(b.dataset.plan);});});
// calculator
var IN_HOUSE=47000;
function calc(){var tx=+$('cTx').value,hr=+$('cHr').value,rate=+$('cRate').value;
 $('cTxO').textContent=tx;$('cHrO').textContent=hr;$('cRateO').textContent='$'+rate;
 var p=tx<=75?['Starter','PLAN-STR',300]:tx<=125?['Standard','PLAN-GRW',500]:['Plus','PLAN-PRM',800];
 var cost=p[2]*12,hrs=hr*52;$('cPlan').textContent=p[0];$('cPlan').dataset.code=p[1];
 $('cCost').textContent=fmt(cost);$('cTime').textContent=hrs.toLocaleString()+' hrs';$('cVal').textContent=fmt(hrs*rate);$('cSave').textContent=fmt(IN_HOUSE-cost)+' less';}
['cTx','cHr','cRate'].forEach(function(i){var e=$(i);if(e)e.addEventListener('input',calc);});
if($('cTx'))calc();
if($('cAdd'))$('cAdd').addEventListener('click',function(){pick($('cPlan').dataset.code);});
// sticky CTA
var cta=$('stickyCta'),closed=false;try{closed=sessionStorage.getItem('def-cta')==='x'}catch(e){}
if(cta){cta.hidden=false;var hero=d.querySelector('.hero');function upd(){var hb=hero?hero.getBoundingClientRect().bottom:0,c=$('cart').getBoundingClientRect(),inCart=c.top<innerHeight&&c.bottom>0,b=$('bill');var inBill=b&&b.style.display==='block'&&b.getBoundingClientRect().top<innerHeight&&b.getBoundingClientRect().bottom>0;
  cta.classList.toggle('show',!closed&&hb<0&&!inCart&&!inBill);}
 addEventListener('scroll',upd,{passive:true});upd();$('ctaClose').addEventListener('click',function(){closed=true;try{sessionStorage.setItem('def-cta','x')}catch(e){}upd();});}
// theme
var tt=$('themeToggle');if(tt){var sync=function(){tt.setAttribute('aria-pressed',d.documentElement.dataset.theme==='dark');};sync();
 tt.addEventListener('click',function(){var dk=d.documentElement.dataset.theme!=='dark';if(dk)d.documentElement.dataset.theme='dark';else delete d.documentElement.dataset.theme;try{localStorage.setItem('def-theme',dk?'dark':'light')}catch(e){}sync();});}
// timeline progress
var tl=d.querySelector('.timeline');if(tl){var line=tl.querySelector('.tl-line i');var f=function(){var r=tl.getBoundingClientRect(),p=Math.min(1,Math.max(0,(innerHeight*0.85-r.top)/(r.height+innerHeight*0.3)));line.style.transform='scaleX('+p+')';};addEventListener('scroll',f,{passive:true});f();}
})();
