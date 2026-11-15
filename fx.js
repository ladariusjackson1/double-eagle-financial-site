/* Cinematic effects. Vanilla JS; everything gated behind html.fx so content stays visible without JS. */
(function(){
var d=document,R=d.documentElement,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reduce)return;R.classList.add('fx');
function ready(f){d.readyState!=='loading'?f():d.addEventListener('DOMContentLoaded',f);}
// Intro curtain (first visit per session, index only)
try{if(d.querySelector('.hero')&&!sessionStorage.getItem('def-intro')){sessionStorage.setItem('def-intro','1');R.classList.add('fx-intro');setTimeout(function(){R.classList.remove('fx-intro');},1150);}}catch(e){}
function countUp(el,dur){var txt=el.textContent,m=txt.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);if(!m)return;var end=parseFloat(m[2].replace(/,/g,'')),dec=(m[2].split('.')[1]||'').length,t0=null,last;
 function fmt(v){return m[1]+v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec})+m[3];}
 function step(t){if(last!==undefined&&el.textContent!==last)return;t0=t0||t;var p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,3);last=fmt(end*e);el.textContent=last;if(p<1)requestAnimationFrame(step);else el.textContent=txt;}
 if(end>0)requestAnimationFrame(step);}
ready(function(){
 // scroll reveal
 var items=d.querySelectorAll('main section:not(#bill), .card, .step, .quote, .staff>div, .info, .kpis>div, .faq-item');
 var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -8% 0px',threshold:.08}):null;
 items.forEach(function(el){var sib=el.parentNode?Array.prototype.indexOf.call(el.parentNode.children,el):0;el.style.setProperty('--i',Math.min(sib,8));el.classList.add('rv');io?io.observe(el):el.classList.add('in');});
 setTimeout(function(){items.forEach(function(el){if(el.getBoundingClientRect().top<innerHeight)el.classList.add('in');});},50);
 // hero parallax
 var card=d.querySelector('.hero-card'),hero=d.querySelector('.hero');
 if(card&&hero&&matchMedia('(pointer:fine)').matches){hero.addEventListener('mousemove',function(e){var r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform='perspective(800px) rotateY('+x*10+'deg) rotateX('+(-y*10)+'deg) translateY('+(-scrollY*.08)+'px)';});
  hero.addEventListener('mouseleave',function(){card.style.transform='';});}
 if(card)addEventListener('scroll',function(){if(scrollY<800)card.style.translate='0 '+(scrollY*.12)+'px';},{passive:true});
 // count-ups
 d.querySelectorAll('.hero-card b, .hero-points li, .kpis b').forEach(function(el){if(el.children.length)return;countUp(el,900);});
 // card tilt
 if(matchMedia('(pointer:fine)').matches)d.addEventListener('mousemove',function(e){var c=e.target.closest&&e.target.closest('.card');d.querySelectorAll('.card.tilt').forEach(function(o){if(o!==c){o.classList.remove('tilt');o.style.transform='';}});if(!c)return;var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.classList.add('tilt');c.style.transform='perspective(700px) rotateY('+x*8+'deg) rotateX('+(-y*8)+'deg) translateY(-4px)';});
 // toast on add
 var toast=d.createElement('div');toast.className='fx-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');d.body.appendChild(toast);var tt;
 d.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-add]');if(!b)return;var c=b.closest('.card'),n=c&&c.querySelector('b');toast.textContent='✓ Added '+(n?n.textContent:'item')+' to your selections';toast.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){toast.classList.remove('show');},2200);
  b.classList.remove('pulse');void b.offsetWidth;b.classList.add('pulse');var ct=d.getElementById('cartTable');if(ct){ct.classList.remove('flash');void ct.offsetWidth;ct.classList.add('flash');}});
 // bill reveal
 var bill=d.getElementById('bill');if(bill)new MutationObserver(function(){if(bill.style.display==='block'){bill.classList.remove('reveal');void bill.offsetWidth;bill.classList.add('reveal');}}).observe(bill,{attributes:true,attributeFilter:['style']});
});
})();
