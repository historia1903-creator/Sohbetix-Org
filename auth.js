(() => {
  'use strict';
  const V=window.SohbetixV29;
  const gateTime=Number(sessionStorage.getItem('sohbetix-auth-entry-v28')||sessionStorage.getItem('sohbetix-auth-entry-v27')||0);
  if(!gateTime || Date.now()-gateTime>10*60*1000){ location.replace('open-chat.html'); return; }
  const $=id=>document.getElementById(id);
  const regForm=$('registerForm'), loginForm=$('loginForm');
  const tabReg=$('tabRegister'), tabLogin=$('tabLogin');
  const norm=v=>String(v||'').trim().toLocaleLowerCase('tr-TR');
  const ret=()=>{const q=new URLSearchParams(location.search).get('return');return q&&!/^https?:/i.test(q)?q:'open-chat.html';};
  async function hash(v){const data=new TextEncoder().encode(v);const buf=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');}
  function setAuth(user){
    localStorage.setItem('sohbetix-auth-type','registered');
    localStorage.setItem('sohbetix-auth-nick',user.username);
    localStorage.setItem('sohbetix-auth-email',user.email);
    localStorage.setItem('sohbetix-auth-id',user.id);
    sessionStorage.removeItem('sohbetix-v17-current-nick');
    sessionStorage.setItem('sohbetix-v28-open-profile','1');
  }
  tabReg.addEventListener('click',()=>{tabReg.classList.add('active');tabLogin.classList.remove('active');regForm.hidden=false;loginForm.hidden=true;});
  tabLogin.addEventListener('click',()=>{tabLogin.classList.add('active');tabReg.classList.remove('active');loginForm.hidden=false;regForm.hidden=true;});
  regForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const u=$('regUser').value.trim(), email=norm($('regEmail').value), pass=$('regPass').value, pass2=$('regPass2').value, st=$('regStatus');
    st.className='auth-status-v21';
    if(u.length<3||u.length>24){st.textContent='Kullanıcı adı 3-24 karakter olmalı.';return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){st.textContent='Geçerli bir e-posta adresi yaz.';return;}
    if(pass.length<8){st.textContent='Şifre en az 8 karakter olmalı.';return;}
    if(pass!==pass2){st.textContent='Şifreler aynı değil.';return;}
    const list=V.users();
    if(list.some(x=>norm(x.username)===norm(u))){st.textContent='Bu kullanıcı adı zaten kayıtlı.';return;}
    if(list.some(x=>norm(x.email)===email)){st.textContent='Bu e-posta zaten kayıtlı.';return;}
    const user={id:V.uuid(),username:u,email,passwordHash:await hash(pass),createdAt:Date.now(),coins:5000,vipUntil:0};
    list.push(user);V.saveUsers(list);setAuth(user);
    st.textContent='✓ Hesap oluşturuldu. Hesabına 5.000 jeton yüklendi.';st.classList.add('ok');
    setTimeout(()=>{sessionStorage.removeItem('sohbetix-auth-entry-v28');sessionStorage.removeItem('sohbetix-auth-entry-v27');location.href=ret();},280);
  });
  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const id=norm($('loginId').value),pass=$('loginPass').value,st=$('loginStatus');
    let user=V.users().find(x=>norm(x.username)===id||norm(x.email)===id);
    if(!user||user.passwordHash!==await hash(pass)){st.textContent='Kullanıcı adı/e-posta veya şifre hatalı.';return;}
    if(!Number.isFinite(Number(user.coins))) user=V.updateUser(user.id,{coins:5000});
    setAuth(user);st.textContent='✓ Giriş başarılı.';st.classList.add('ok');
    setTimeout(()=>{sessionStorage.removeItem('sohbetix-auth-entry-v28');sessionStorage.removeItem('sohbetix-auth-entry-v27');location.href=ret();},220);
  });
})();
