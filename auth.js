(() => {
  'use strict';
  const gateTime=Number(sessionStorage.getItem('sohbetix-auth-entry-v26')||0);
  if(!gateTime || Date.now()-gateTime>10*60*1000){ location.replace('open-chat.html'); return; }
  const $=id=>document.getElementById(id);
  const regForm=$('registerForm'), loginForm=$('loginForm');
  const tabReg=$('tabRegister'), tabLogin=$('tabLogin');
  const storeKey='sohbetix-local-users-v25';
  const oldStoreKey='sohbetix-local-users-v24';
  if(!localStorage.getItem(storeKey) && localStorage.getItem(oldStoreKey)){
    localStorage.setItem(storeKey, localStorage.getItem(oldStoreKey));
  }
  const ret=()=>{const q=new URLSearchParams(location.search).get('return'); return q && !/^https?:/i.test(q) ? q : 'open-chat.html';};
  const safe=raw=>{try{return JSON.parse(raw||'[]')}catch{return[]}};
  const users=()=>safe(localStorage.getItem(storeKey));
  const saveUsers=v=>localStorage.setItem(storeKey,JSON.stringify(v));
  const norm=v=>String(v||'').trim().toLocaleLowerCase('tr-TR');
  async function hash(v){const data=new TextEncoder().encode(v);const buf=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');}
  function setAuth(user){
    localStorage.setItem('sohbetix-auth-type','registered');
    localStorage.setItem('sohbetix-auth-nick',user.username);
    localStorage.setItem('sohbetix-auth-email',user.email);
    localStorage.setItem('sohbetix-auth-id',user.id);
    sessionStorage.removeItem('sohbetix-v17-current-nick');
    sessionStorage.setItem('sohbetix-v26-open-profile','1');
  }
  tabReg.addEventListener('click',()=>{tabReg.classList.add('active');tabLogin.classList.remove('active');regForm.hidden=false;loginForm.hidden=true;});
  tabLogin.addEventListener('click',()=>{tabLogin.classList.add('active');tabReg.classList.remove('active');loginForm.hidden=false;regForm.hidden=true;});

  const questions=(()=>{
    const bank=[];
    for(let a=11;a<=60;a++) for(let b=2;b<=31;b++) bank.push({q:`${a} + ${b} kaç eder?`,a:String(a+b)});
    for(let a=41;a<=80;a++) for(let b=2;b<=31;b++) bank.push({q:`${a} - ${b} kaç eder?`,a:String(a-b)});
    for(let a=2;a<=25;a++) for(let b=2;b<=31;b++) bank.push({q:`${a} × ${b} kaç eder?`,a:String(a*b)});
    bank.push(
      {q:'Bir haftada kaç gün vardır?',a:'7'},
      {q:'Türkiye’nin başkenti nedir?',a:'ankara'},
      {q:'2, 4, 6, 8, ? dizisini tamamla.',a:'10'},
      {q:'“robot” kelimesini tersten yaz.',a:'tobor'},
      {q:'KIRMIZI kelimesini küçük harfle yaz.',a:'kırmızı'}
    );
    return bank;
  })();
  let challenge=null, passed=false, captchaStage=0; const CAPTCHA_REQUIRED_STAGES=1;
  function newChallenge(){challenge=questions[Math.floor(Math.random()*questions.length)];$('regCaptchaQ').textContent=challenge.q;$('regCaptchaA').value='';}
  newChallenge();
  $('regCaptchaCheck').addEventListener('click',()=>{
    const ok=norm($('regCaptchaA').value)===norm(challenge.a);
    if(ok){
      captchaStage++;
      if(captchaStage>=CAPTCHA_REQUIRED_STAGES){
        passed=true;
        $('regCaptchaStatus').textContent='✓ Güvenlik doğrulaması tamamlandı.';
        $('regCaptchaStatus').className='ok';
        $('registerSubmitV21').disabled=false;
      }else{
        passed=false;
        $('regCaptchaStatus').textContent='✓ Güvenlik doğrulaması tamamlandı.';
        $('regCaptchaStatus').className='ok';
        $('registerSubmitV21').disabled=true;
        newChallenge();
      }
    }else{
      passed=false; captchaStage=0;
      $('regCaptchaStatus').textContent='Yanlış cevap. Yeni bir güvenlik sorusu oluşturuldu.';
      $('regCaptchaStatus').className='error';
      $('registerSubmitV21').disabled=true;
      newChallenge();
    }
  });

  regForm.addEventListener('submit',async e=>{
    e.preventDefault(); const u=$('regUser').value.trim(), email=norm($('regEmail').value), p=$('regPass').value, p2=$('regPass2').value;
    const st=$('regStatus'); st.className='auth-status-v21';
    if(!passed){st.textContent='Önce güvenlik doğrulamasını tamamla.';return;}
    if(u.length<3||u.length>24){st.textContent='Kullanıcı adı 3-24 karakter olmalı.';return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){st.textContent='Geçerli bir e-posta adresi yaz.';return;}
    if(p.length<8){st.textContent='Şifre en az 8 karakter olmalı.';return;}
    if(p!==p2){st.textContent='Şifreler aynı değil.';return;}
    const list=users(); if(list.some(x=>norm(x.username)===norm(u))){st.textContent='Bu kullanıcı adı zaten kayıtlı.';return;} if(list.some(x=>norm(x.email)===email)){st.textContent='Bu e-posta zaten kayıtlı.';return;}
    const user={id:(crypto.randomUUID?crypto.randomUUID():'u-'+Date.now()),username:u,email,passwordHash:await hash(p),createdAt:Date.now()}; list.push(user);saveUsers(list);setAuth(user);st.textContent='✓ Hesap oluşturuldu. Sohbete yönlendiriliyorsun...';st.classList.add('ok');setTimeout(()=>{sessionStorage.removeItem('sohbetix-auth-entry-v26');location.href=ret();},350);
  });

  loginForm.addEventListener('submit',async e=>{
    e.preventDefault(); const id=norm($('loginId').value), p=$('loginPass').value, st=$('loginStatus');
    const user=users().find(x=>norm(x.username)===id||norm(x.email)===id); if(!user||user.passwordHash!==await hash(p)){st.textContent='Kullanıcı adı/e-posta veya şifre hatalı.';return;} setAuth(user);st.textContent='✓ Giriş başarılı. Sohbete yönlendiriliyorsun...';st.classList.add('ok');setTimeout(()=>{sessionStorage.removeItem('sohbetix-auth-entry-v26');location.href=ret();},300);
  });
})();