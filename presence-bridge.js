(() => {
  'use strict';
  const V=window.SohbetixV33; if(!V) return;
  const nick=String(sessionStorage.getItem('sohbetix-v17-current-nick')||'').trim();
  const slug=String(sessionStorage.getItem('sohbetix-v30-last-room')||sessionStorage.getItem('sohbetix-v28-last-room')||'').trim();
  if(!nick||!slug) return;
  const clientKey='sohbetix-v30-client-id:'+slug;
  let clientId=sessionStorage.getItem(clientKey)||sessionStorage.getItem('sohbetix-v28-client-id:'+slug);
  if(!clientId){clientId=crypto?.randomUUID?.()||`client-${Date.now()}-${Math.random().toString(36).slice(2)}`;sessionStorage.setItem(clientKey,clientId);}
  const key='sohbetix-v30-room-presence:'+slug;
  const registered=localStorage.getItem('sohbetix-auth-type')==='registered' && !!localStorage.getItem('sohbetix-auth-id');
  const PRIVATE_NOTIFY_PREFIX='sohbetix-v32-private-notify:'+slug+':';
  const CHANNEL='sohbetix-v32-private:'+slug;
  const seen=new Set();
  function safe(raw){try{return raw?JSON.parse(raw):{}}catch{return {}}}
  function touch(extra={}){
    const p=safe(localStorage.getItem(key));
    p[clientId]={...(p[clientId]||{}),nick,registered,ownerId:String(localStorage.getItem('sohbetix-auth-id')||''),profileId:V.getProfileByNick(nick)?.id||'',status:p[clientId]?.status||'online',lastSeen:Date.now(),suspended:!!document.hidden,closingAt:0,bridge:true,...extra};
    localStorage.setItem(key,JSON.stringify(p));
  }
  function markClosing(){const p=safe(localStorage.getItem(key));const old=p[clientId]||{};p[clientId]={...old,nick,registered,lastSeen:Date.now(),suspended:false,closingAt:Date.now(),bridge:true};localStorage.setItem(key,JSON.stringify(p));}
  function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function privateNotice(payload){
    if(!payload||seen.has(payload.id)||V.norm(payload.receiver)!==V.norm(nick)||V.norm(payload.sender)===V.norm(nick))return;
    seen.add(payload.id); if(seen.size>100){const first=seen.values().next().value;seen.delete(first);}
    const active=String(sessionStorage.getItem('sohbetix-v32-active-private')||'');
    if(document.visibilityState==='visible' && V.norm(active)===V.norm(payload.sender))return;
    document.querySelectorAll('.private-notification-v32').forEach(x=>x.remove());
    const box=document.createElement('button');box.type='button';box.className='private-notification-v32';
    const preview=payload.type==='image'?'📷 Fotoğraf/GIF gönderdi':String(payload.text||'Yeni gizli mesaj').slice(0,90);
    box.innerHTML=`<strong>${esc(payload.sender)}</strong><span>${esc(preview)}</span><small>Gizli mesaj geldi</small>`;
    box.onclick=()=>{sessionStorage.setItem('sohbetix-v32-open-private',String(payload.sender||''));if(!/open-chat\.html$/i.test(location.pathname))location.href='open-chat.html?room='+encodeURIComponent(slug);else{location.reload();}};
    document.body.appendChild(box);setTimeout(()=>box.remove(),6500);
    if(document.hidden && 'Notification' in window && Notification.permission==='granted'){
      try{new Notification('Sohbetix · Gizli mesaj',{body:`${payload.sender}: ${preview}`,icon:'sohbetix-logo.jpg'});}catch{}
    }
  }
  touch();
  setInterval(()=>{if(!document.hidden)touch({suspended:false,closingAt:0});},15000);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)touch({suspended:true,closingAt:0});else touch({suspended:false,closingAt:0});});
  window.addEventListener('pageshow',()=>touch({suspended:false,closingAt:0}));
  window.addEventListener('pagehide',e=>{if(!e.persisted)markClosing();});
  window.addEventListener('beforeunload',markClosing);
  window.addEventListener('storage',e=>{if(e.key&&e.key.startsWith(PRIVATE_NOTIFY_PREFIX)&&e.newValue){try{privateNotice(JSON.parse(e.newValue));}catch{}}});
  try{if('BroadcastChannel' in window){const bc=new BroadcastChannel(CHANNEL);bc.onmessage=e=>privateNotice(e.data);}}catch{}
})();
