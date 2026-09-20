(() => {
  'use strict';
  const V=window.SohbetixV31;
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
  regForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=norm($('regEmail').value),pass=$('regPass').value,pass2=$('regPass2').value,st=$('regStatus');
    st.className='auth-status-v21';st.textContent='';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){st.textContent='Geçerli bir e-posta adresi yaz.';return;}
    if(pass.length<8){st.textContent='Şifre en az 8 karakter olmalı.';return;}
    if(pass!==pass2){st.textContent='Şifreler aynı değil.';return;}
    const list=V.users();
    if(list.some(x=>norm(x.email)===email)){st.textContent='Bu e-posta zaten kayıtlı.';return;}
    const user={id:V.uuid(),email,passwordHash:await hash(pass),createdAt:Date.now(),coins:5000,vipUntil:0};
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
    if(!Number.isFinite(Number(user.coins))) user=V.updateUser(user.id,{coins:5000});
    setAuth(user);st.textContent='✓ Giriş başarılı.';st.classList.add('ok');setTimeout(done,240);
  });
})();
