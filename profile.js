(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const target=(params.get('nick')||sessionStorage.getItem('sohbetix-v17-current-nick')||localStorage.getItem('sohbetix-auth-nick')||'Kullanıcı').trim().slice(0,24);
  const me=(sessionStorage.getItem('sohbetix-v17-current-nick')||'').trim();
  const isOwn=!!me && me.toLocaleLowerCase('tr-TR')===target.toLocaleLowerCase('tr-TR');
  const esc=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const aboutKey='sohbetix-v27-profile-about:'+target.toLocaleLowerCase('tr-TR');
  const photoKey='sohbetix-v27-profile-photo:'+target.toLocaleLowerCase('tr-TR');

  $('profileNickV27').textContent=target;
  document.title=target+' - Sohbetix Profil';
  const about=localStorage.getItem(aboutKey);
  if(about) $('profileAboutV27').textContent=about;
  const photo=localStorage.getItem(photoKey);
  if(photo) $('profilePhotoImgV27').src=photo;

  function refreshOnline(){
    let presence={};
    try{presence=JSON.parse(localStorage.getItem('sohbetix-v17-room-presence')||'{}')}catch{}
    const now=Date.now();
    const online=Object.values(presence).some(x=>x&&String(x.nick||'').toLocaleLowerCase('tr-TR')===target.toLocaleLowerCase('tr-TR')&&now-Number(x.lastSeen||0)<=16000);
    $('profileOnlineV27').textContent=online?'ONLINE':'ÇEVRİMDIŞI';
    $('profileOnlineV27').classList.toggle('offline',!online);
  }
  refreshOnline();
  setInterval(refreshOnline,4000);

  if(!isOwn){
    $('profilePhotoChangeV27').hidden=true;
    $('profileEditBtnV27').hidden=true;
  }

  const dialog=$('profileDialogV27');
  $('profileEditBtnV27').addEventListener('click',()=>{
    if(!isOwn)return;
    $('profileAboutInputV27').value=localStorage.getItem(aboutKey)||'';
    dialog.hidden=false;
    setTimeout(()=>$('profileAboutInputV27').focus(),30);
  });
  $('profileDialogCloseV27').addEventListener('click',()=>dialog.hidden=true);
  $('profileAboutSaveV27').addEventListener('click',()=>{
    const value=$('profileAboutInputV27').value.trim().slice(0,300);
    localStorage.setItem(aboutKey,value);
    $('profileAboutV27').textContent=value||'Bu kullanıcı henüz profil açıklaması eklemedi.';
    dialog.hidden=true;
  });

  $('profilePhotoChangeV27').addEventListener('click',()=>{if(isOwn)$('profilePhotoInputV27').click();});
  $('profilePhotoInputV27').addEventListener('change',()=>{
    const file=$('profilePhotoInputV27').files?.[0];
    if(!file)return;
    if(file.size>700000){alert('Fotoğraf en fazla 700 KB olabilir.');return;}
    const reader=new FileReader();
    reader.onload=()=>{
      const data=String(reader.result||'');
      localStorage.setItem(photoKey,data);
      $('profilePhotoImgV27').src=data;
    };
    reader.readAsDataURL(file);
  });

  const ignoredDialog=$('ignoredDialogV27');
  $('profileIgnoredBtnV27').addEventListener('click',()=>{
    let list=[]; try{list=JSON.parse(localStorage.getItem('sohbetix-v20-ignore-list')||'[]')}catch{}
    $('ignoredListV27').innerHTML=list.length?list.map(x=>`<div>${esc(x)}</div>`).join(''):'<p>Engellenen kullanıcı yok.</p>';
    ignoredDialog.hidden=false;
  });
  $('ignoredDialogCloseV27').addEventListener('click',()=>ignoredDialog.hidden=true);

  [dialog,ignoredDialog].forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.hidden=true;}));
})();