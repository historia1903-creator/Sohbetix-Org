(() => {
  'use strict';
  const V=window.SohbetixV31; if(!V) return;
  const nick=String(sessionStorage.getItem('sohbetix-v17-current-nick')||'').trim();
  const slug=String(sessionStorage.getItem('sohbetix-v30-last-room')||sessionStorage.getItem('sohbetix-v28-last-room')||'').trim();
  if(!nick||!slug) return;
  const clientKey='sohbetix-v30-client-id:'+slug;
  let clientId=sessionStorage.getItem(clientKey)||sessionStorage.getItem('sohbetix-v28-client-id:'+slug);
  if(!clientId){clientId=crypto?.randomUUID?.()||`client-${Date.now()}-${Math.random().toString(36).slice(2)}`;sessionStorage.setItem(clientKey,clientId);}
  const key='sohbetix-v30-room-presence:'+slug;
  const registered=localStorage.getItem('sohbetix-auth-type')==='registered' && !!localStorage.getItem('sohbetix-auth-id');
  function safe(raw){try{return raw?JSON.parse(raw):{}}catch{return {}}}
  function touch(){
    const p=safe(localStorage.getItem(key));
    p[clientId]={...(p[clientId]||{}),nick,registered,ownerId:String(localStorage.getItem('sohbetix-auth-id')||''),profileId:V.getProfileByNick(nick)?.id||'',status:p[clientId]?.status||'online',lastSeen:Date.now(),bridge:true};
    localStorage.setItem(key,JSON.stringify(p));
  }
  touch();
  const timer=setInterval(touch,15000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)touch();});
  window.addEventListener('pageshow',touch);
})();
