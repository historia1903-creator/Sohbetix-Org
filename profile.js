(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const target=(params.get('nick')||sessionStorage.getItem('sohbetix-v17-current-nick')||localStorage.getItem('sohbetix-auth-nick')||'Kullanıcı').trim().slice(0,24);
  const me=(sessionStorage.getItem('sohbetix-v17-current-nick')||'').trim();
  const isOwn=!!me && me.toLocaleLowerCase('tr-TR')===target.toLocaleLowerCase('tr-TR');
  const esc=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const aboutKey='sohbetix-v26-profile-about:'+target.toLocaleLowerCase('tr-TR');
  const photoKey='sohbetix-v26-profile-photo:'+target.toLocaleLowerCase('tr-TR');

  $('profileNickV26').textContent=target;
  document.title=target+' - Sohbetix Profil';
  const about=localStorage.getItem(aboutKey);
  if(about) $('profileAboutV26').textContent=about;
  const photo=localStorage.getItem(photoKey);
  if(photo) $('profilePhotoImgV26').src=photo;

  function refreshOnline(){
    let presence={};
    try{presence=JSON.parse(localStorage.getItem('sohbetix-v17-room-presence')||'{}')}catch{}
    const now=Date.now();
    const online=Object.values(presence).some(x=>x&&String(x.nick||'').toLocaleLowerCase('tr-TR')===target.toLocaleLowerCase('tr-TR')&&now-Number(x.lastSeen||0)<=16000);
    $('profileOnlineV26').textContent=online?'ONLINE':'ÇEVRİMDIŞI';
    $('profileOnlineV26').classList.toggle('offline',!online);
  }
  refreshOnline();
  setInterval(refreshOnline,4000);

  if(!isOwn){
    $('profilePhotoChangeV26').hidden=true;
    $('profileEditBtnV26').hidden=true;
  }

  const dialog=$('profileDialogV26');
  $('profileEditBtnV26').addEventListener('click',()=>{
    if(!isOwn)return;
    $('profileAboutInputV26').value=localStorage.getItem(aboutKey)||'';
    dialog.hidden=false;
    setTimeout(()=>$('profileAboutInputV26').focus(),30);
  });
  $('profileDialogCloseV26').addEventListener('click',()=>dialog.hidden=true);
  $('profileAboutSaveV26').addEventListener('click',()=>{
    const value=$('profileAboutInputV26').value.trim().slice(0,300);
    localStorage.setItem(aboutKey,value);
    $('profileAboutV26').textContent=value||'Bu kullanıcı henüz profil açıklaması eklemedi.';
    dialog.hidden=true;
  });

  $('profilePhotoChangeV26').addEventListener('click',()=>{if(isOwn)$('profilePhotoInputV26').click();});
  $('profilePhotoInputV26').addEventListener('change',()=>{
    const file=$('profilePhotoInputV26').files?.[0];
    if(!file)return;
    if(file.size>700000){alert('Fotoğraf en fazla 700 KB olabilir.');return;}
    const reader=new FileReader();
    reader.onload=()=>{
      const data=String(reader.result||'');
      localStorage.setItem(photoKey,data);
      $('profilePhotoImgV26').src=data;
    };
    reader.readAsDataURL(file);
  });

  const ignoredDialog=$('ignoredDialogV26');
  $('profileIgnoredBtnV26').addEventListener('click',()=>{
    let list=[]; try{list=JSON.parse(localStorage.getItem('sohbetix-v20-ignore-list')||'[]')}catch{}
    $('ignoredListV26').innerHTML=list.length?list.map(x=>`<div>${esc(x)}</div>`).join(''):'<p>Engellenen kullanıcı yok.</p>';
    ignoredDialog.hidden=false;
  });
  $('ignoredDialogCloseV26').addEventListener('click',()=>ignoredDialog.hidden=true);

  [dialog,ignoredDialog].forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.hidden=true;}));
})();