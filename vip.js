(()=>{
'use strict';
const V=window.SohbetixV32,$=id=>document.getElementById(id),u=V.ensureCurrentUser();
if(!u){location.replace('open-chat.html');return;}
const m=$('vipModalV28'),open=$('buyVipOpenV28'),close=$('vipCloseV28'),balance=$('vipBalanceV28'),status=$('vipModalStatusV28'),vipState=$('vipStateV31'),vipExpiry=$('vipExpiryV31'),vipCountdown=$('vipCountdownV31');
function draw(){if(balance)balance.textContent=V.coinBalance().toLocaleString('tr-TR');drawVipTime();}
function formatLeft(ms){
  ms=Math.max(0,Number(ms)||0);const d=Math.floor(ms/86400000);ms%=86400000;const h=Math.floor(ms/3600000);ms%=3600000;const m=Math.floor(ms/60000);const sec=Math.floor((ms%60000)/1000);return `${d} gün ${h} sa ${m} dk ${sec} sn`;
}
function drawVipTime(){
  const user=V.ensureCurrentUser(); if(!user)return;
  const until=Number(user.vipUntil||0),active=until>Date.now();
  if(vipState)vipState.textContent=active?'✓ VIP aktif':'VIP aktif değil';
  if(vipExpiry)vipExpiry.textContent=active?'Bitiş: '+new Date(until).toLocaleString('tr-TR'):'VIP satın aldığında bitiş tarihi burada görünür.';
  if(vipCountdown)vipCountdown.textContent=active?'Kalan süre: '+formatLeft(until-Date.now()):'';
}

function show(){draw();status.textContent='';m.hidden=false;}
draw(); setInterval(drawVipTime,1000); if(open)open.addEventListener('click',show); if(close)close.addEventListener('click',()=>m.hidden=true);
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
