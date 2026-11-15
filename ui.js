/* Site UI helpers: mobile nav, FAQ, back-to-top, year. No dependencies. */
(function(){
  var t=document.getElementById('navToggle'),n=document.getElementById('siteNav');
  if(t&&n){t.addEventListener('click',function(){var o=n.classList.toggle('open');t.setAttribute('aria-expanded',o);});
    n.addEventListener('click',function(e){if(e.target.tagName==='A'){n.classList.remove('open');t.setAttribute('aria-expanded','false');}});}
  document.querySelectorAll('.faq-q').forEach(function(b){b.addEventListener('click',function(){var o=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',!o);document.getElementById(b.getAttribute('aria-controls')).hidden=o;});});
  var top=document.getElementById('toTop');
  if(top){window.addEventListener('scroll',function(){top.classList.toggle('show',window.scrollY>500);});top.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});}
})();
