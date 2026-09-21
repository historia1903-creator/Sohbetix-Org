(() => {
  'use strict';
  const V=window.SohbetixV33;
  const gateTime=Number(sessionStorage.getItem('sohbetix-auth-entry-v30')||sessionStorage.getItem('sohbetix-auth-entry-v28')||0);
  if(!gateTime || Date.now()-gateTime>10*60*1000){ location.replace('open-chat.html'); return; }
  const $=id=>document.getElementById(id);
  const regForm=$('registerForm'), loginForm=$('loginForm');
  const tabReg=$('tabRegister'), tabLogin=$('tabLogin');
  const norm=v=>String(v||'').trim().toLocaleLowerCase('tr-TR');
  const ret=()=>{const q=new URLSearchParams(location.search).get('return');return q&&!/^https?:/i.test(q)?q:'open-chat.html';};
  async function hash(v){const data=new TextEncoder().encode(v);const buf=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');}
  function setAuth(user){
    localStorage.setItem('sohbetix-auth-type','registered');
    localStorage.removeItem('sohbetix-auth-nick');
    localStorage.setItem('sohbetix-auth-email',user.email);
    localStorage.setItem('sohbetix-auth-id',user.id);
    sessionStorage.removeItem('sohbetix-v17-current-nick');
    sessionStorage.setItem('sohbetix-v30-open-profile','1');
  }
  function done(){['sohbetix-auth-entry-v30','sohbetix-auth-entry-v28','sohbetix-auth-entry-v27'].forEach(k=>sessionStorage.removeItem(k));location.href=ret();}
  tabReg.addEventListener('click',()=>{tabReg.classList.add('active');tabLogin.classList.remove('active');regForm.hidden=false;loginForm.hidden=true;});
  tabLogin.addEventListener('click',()=>{tabLogin.classList.add('active');tabReg.classList.remove('active');loginForm.hidden=false;regForm.hidden=true;});

  // V33 e-posta doğrulama kapısı. AWS üzerinde /api/auth/send-verification ve
  // /api/auth/verify-email bağlandığında gerçek e-posta servisini doğrudan kullanır.
  // Statik GitHub Pages önizlemesinde akış test edilebilsin diye tek kullanımlık kod
  // yalnızca bu tarayıcı oturumunda üretilir ve ekranda gösterilir.
  let verifiedEmail='';
  let localCode='';
  let localCodeExpires=0;
  const verifyStatus=$('emailVerifyStatusV33');
  const codeRow=$('emailCodeRowV33');
  const codeInput=$('emailCodeV33');
  function resetVerification(){verifiedEmail='';localCode='';localCodeExpires=0;codeRow.hidden=true;verifyStatus.className='email-verify-status-v33';verifyStatus.textContent='Kayıt için e-posta doğrulaması zorunludur.';}
  $('regEmail').addEventListener('input',()=>{if(norm($('regEmail').value)!==verifiedEmail)resetVerification();});
  async function callJson(url,body){
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    if(!r.ok)throw new Error('endpoint');
    return r.json();
  }
  $('sendEmailCodeV33').addEventListener('click',async()=>{
    const email=norm($('regEmail').value);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){verifyStatus.textContent='Önce geçerli bir e-posta adresi yaz.';return;}
    verifiedEmail='';codeInput.value='';codeRow.hidden=false;
    try{
      const data=await callJson('/api/auth/send-verification',{email});
      if(!data?.ok)throw new Error('send');
      verifyStatus.className='email-verify-status-v33 pending';
      verifyStatus.textContent='Doğrulama kodu e-posta adresine gönderildi.';
      localCode='';localCodeExpires=0;
    }catch{
      localCode=String(Math.floor(100000+Math.random()*900000));localCodeExpires=Date.now()+10*60*1000;
      sessionStorage.setItem('sohbetix-v33-email-preview-code',localCode);
      verifyStatus.className='email-verify-status-v33 pending';
      verifyStatus.textContent='E-posta sunucusu bağlı olmadığı için önizleme kodu: '+localCode;
    }
  });
  $('verifyEmailCodeV33').addEventListener('click',async()=>{
    const email=norm($('regEmail').value),code=String(codeInput.value||'').trim();
    if(!email||code.length!==6){verifyStatus.textContent='6 haneli doğrulama kodunu yaz.';return;}
    let ok=false;
    if(localCode){ok=Date.now()<localCodeExpires&&code===localCode;}
    else{
      try{const data=await callJson('/api/auth/verify-email',{email,code});ok=!!data?.ok;}catch{ok=false;}
    }
    if(!ok){verifiedEmail='';verifyStatus.className='email-verify-status-v33 error';verifyStatus.textContent='Doğrulama kodu hatalı veya süresi dolmuş.';return;}
    verifiedEmail=email;verifyStatus.className='email-verify-status-v33 ok';verifyStatus.textContent='✓ E-posta doğrulandı.';codeInput.disabled=true;$('verifyEmailCodeV33').disabled=true;
  });

  regForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=norm($('regEmail').value),pass=$('regPass').value,pass2=$('regPass2').value,st=$('regStatus');
    st.className='auth-status-v21';st.textContent='';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){st.textContent='Geçerli bir e-posta adresi yaz.';return;}
    if(verifiedEmail!==email){st.textContent='Kayıt olmadan önce e-posta adresini doğrula.';return;}
    if(pass.length<8){st.textContent='Şifre en az 8 karakter olmalı.';return;}
    if(pass!==pass2){st.textContent='Şifreler aynı değil.';return;}
    const list=V.users();
    if(list.some(x=>norm(x.email)===email)){st.textContent='Bu e-posta zaten kayıtlı.';return;}
    const user={id:V.uuid(),email,emailVerified:true,emailVerifiedAt:Date.now(),passwordHash:await hash(pass),createdAt:Date.now(),coins:5000,vipUntil:0};
    list.push(user);V.saveUsers(list);setAuth(user);
    st.textContent='✓ Hesap oluşturuldu. Sohbet rumuzunu Yeni profil oluştur bölümünden seçebilirsin.';st.classList.add('ok');
    setTimeout(done,320);
  });
  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=norm($('loginId').value),pass=$('loginPass').value,st=$('loginStatus');
    st.className='auth-status-v21';st.textContent='';
    let user=V.users().find(x=>norm(x.email)===email);
    if(!user||user.passwordHash!==await hash(pass)){st.textContent='E-posta veya şifre hatalı.';return;}
    if(user.emailVerified===false){st.textContent='Bu hesabın e-posta doğrulaması tamamlanmamış.';return;}
    if(!Number.isFinite(Number(user.coins))) user=V.updateUser(user.id,{coins:5000});
    setAuth(user);st.textContent='✓ Giriş başarılı.';st.classList.add('ok');setTimeout(done,240);
  });
})();
