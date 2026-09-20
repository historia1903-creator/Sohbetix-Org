(()=>{
'use strict';
const V=window.SohbetixV30,$=id=>document.getElementById(id),u=V.ensureCurrentUser();
if(!u){location.replace('open-chat.html');return;}
const m=$('vipModalV28'),open=$('buyVipOpenV28'),close=$('vipCloseV28'),balance=$('vipBalanceV28'),status=$('vipModalStatusV28');
function draw(){if(balance)balance.textContent=V.coinBalance().toLocaleString('tr-TR');}
function show(){draw();status.textContent='';m.hidden=false;}
draw(); if(open)open.addEventListener('click',show); if(close)close.addEventListener('click',()=>m.hidden=true);
if(m)m.addEventListener('click',e=>{if(e.target===m)m.hidden=true;});
const coins=$('vipCoinsLinkV28');if(coins)coins.addEventListener('click',()=>location.href='coins.html');
document.querySelectorAll('.vip-plan-v28').forEach(b=>b.addEventListener('click',()=>{
  const plan=b.dataset.plan==='year'?'year':'month',cost=plan==='year'?1200:150,label=plan==='year'?'1 yıllık':'1 aylık';
  draw(); if(V.coinBalance()<cost){status.textContent=`Yeterli jeton yok. Gerekli: ${cost} jeton.`;return;}
  if(!confirm(`${label} VIP için ${cost} jeton harcamak istiyor musunuz?`))return;
  const r=V.buyVip(plan); if(!r.ok){status.textContent=r.error||'VIP satın alınamadı.';draw();return;}
  status.textContent=`✓ VIP aktif edildi. ${cost} jeton düşüldü.`;draw();
  setTimeout(()=>{const nick=sessionStorage.getItem('sohbetix-v17-current-nick')||'';location.href=nick?'profile.html?nick='+encodeURIComponent(nick):'open-chat.html';},650);
}));
})();
