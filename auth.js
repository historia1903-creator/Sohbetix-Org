(() => {
  'use strict';
  const gateTime=Number(sessionStorage.getItem('sohbetix-auth-entry-v22')||0);
  if(!gateTime || Date.now()-gateTime>10*60*1000){ location.replace('open-chat.html'); return; }
  const $=id=>document.getElementById(id);
  const regForm=$('registerForm'), loginForm=$('loginForm');
  const tabReg=$('tabRegister'), tabLogin=$('tabLogin');
  const storeKey='sohbetix-local-users-v22';
  const oldStoreKey='sohbetix-demo-users-v21';
  if(!localStorage.getItem(storeKey) && localStorage.getItem(oldStoreKey)){
    localStorage.setItem(storeKey, localStorage.getItem(oldStoreKey));
  }
  const ret=()=>{const q=new URLSearchParams(location.search).get('return'); return q && !/^https?:/i.test(q) ? q : 'open-chat.html';};
  const safe=raw=>{try{return JSON.parse(raw||'[]')}catch{return[]}};
  const users=()=>safe(localStorage.getItem(storeKey));
  const saveUsers=v=>localStorage.setItem(storeKey,JSON.stringify(v));
  const norm=v=>String(v||'').trim().toLocaleLowerCase('tr-TR');
  async function hash(v){const data=new TextEncoder().encode(v);const buf=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');}
  function setAuth(user){localStorage.setItem('sohbetix-auth-type','registered');localStorage.setItem('sohbetix-auth-nick',user.username);localStorage.setItem('sohbetix-auth-email',user.email);localStorage.setItem('sohbetix-auth-id',user.id);sessionStorage.setItem('sohbetix-v17-current-nick',user.username);}
  tabReg.addEventListener('click',()=>{tabReg.classList.add('active');tabLogin.classList.remove('active');regForm.hidden=false;loginForm.hidden=true;});
  tabLogin.addEventListener('click',()=>{tabLogin.classList.add('active');tabReg.classList.remove('active');loginForm.hidden=false;regForm.hidden=true;});

  const questions=[
    ()=>{const a=5+Math.floor(Math.random()*20),b=4+Math.floor(Math.random()*18);return {q:`${a} + ${b} kaç eder?`,a:String(a+b)}},
    ()=>{const a=25+Math.floor(Math.random()*30),b=3+Math.floor(Math.random()*14);return {q:`${a} - ${b} kaç eder?`,a:String(a-b)}},
    ()=>{const a=2+Math.floor(Math.random()*8),b=2+Math.floor(Math.random()*7);return {q:`${a} × ${b} kaç eder?`,a:String(a*b)}},
    ()=>({q:'Bir haftada kaç gün vardır?',a:'7'}), ()=>({q:'Türkiye’nin başkenti nedir?',a:'ankara'}),
    ()=>({q:'2, 4, 6, 8, ? dizisini tamamla.',a:'10'}), ()=>({q:'“robot” kelimesini tersten yaz.',a:'tobor'}),
    ()=>({q:'KIRMIZI kelimesini küçük harfle yaz.',a:'kırmızı'})
  ];
  let challenge=null, passed=false;
  function newChallenge(){challenge=questions[Math.floor(Math.random()*questions.length)]();$('regCaptchaQ').textContent=challenge.q;$('regCaptchaA').value='';}
  newChallenge();
  $('regCaptchaCheck').addEventListener('click',()=>{const ok=norm($('regCaptchaA').value)===norm(challenge.a);passed=ok;$('regCaptchaStatus').textContent=ok?'✓ Doğrulama tamamlandı.':'Yanlış cevap. Yeni soru oluşturuldu.';$('regCaptchaStatus').className=ok?'ok':'error';$('registerSubmitV21').disabled=!ok;if(!ok)newChallenge();});

  regForm.addEventListener('submit',async e=>{
    e.preventDefault(); const u=$('regUser').value.trim(), email=norm($('regEmail').value), p=$('regPass').value, p2=$('regPass2').value;
    const st=$('regStatus'); st.className='auth-status-v21';
    if(!passed){st.textContent='Önce güvenlik doğrulamasını tamamla.';return;}
    if(u.length<3||u.length>24){st.textContent='Kullanıcı adı 3-24 karakter olmalı.';return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){st.textContent='Geçerli bir e-posta adresi yaz.';return;}
    if(p.length<8){st.textContent='Şifre en az 8 karakter olmalı.';return;}
    if(p!==p2){st.textContent='Şifreler aynı değil.';return;}
    const list=users(); if(list.some(x=>norm(x.username)===norm(u))){st.textContent='Bu kullanıcı adı zaten kayıtlı.';return;} if(list.some(x=>norm(x.email)===email)){st.textContent='Bu e-posta zaten kayıtlı.';return;}
    const user={id:(crypto.randomUUID?crypto.randomUUID():'u-'+Date.now()),username:u,email,passwordHash:await hash(p),createdAt:Date.now()}; list.push(user);saveUsers(list);setAuth(user);st.textContent='✓ Hesap oluşturuldu. Sohbete yönlendiriliyorsun...';st.classList.add('ok');setTimeout(()=>{sessionStorage.removeItem('sohbetix-auth-entry-v22');location.href=ret();},350);
  });

  loginForm.addEventListener('submit',async e=>{
    e.preventDefault(); const id=norm($('loginId').value), p=$('loginPass').value, st=$('loginStatus');
    const user=users().find(x=>norm(x.username)===id||norm(x.email)===id); if(!user||user.passwordHash!==await hash(p)){st.textContent='Kullanıcı adı/e-posta veya şifre hatalı.';return;} setAuth(user);st.textContent='✓ Giriş başarılı. Sohbete yönlendiriliyorsun...';st.classList.add('ok');setTimeout(()=>{sessionStorage.removeItem('sohbetix-auth-entry-v22');location.href=ret();},300);
  });
})();