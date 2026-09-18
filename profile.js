(() => {
  'use strict'; const V=window.SohbetixV29,$=id=>document.getElementById(id);
  const target=V.cleanNick(new URLSearchParams(location.search).get('nick')||sessionStorage.getItem('sohbetix-v17-current-nick')||localStorage.getItem('sohbetix-auth-nick')||'Kullanıcı');
  const ctx=V.profileContext(target), me=V.currentUserId(), isOwn=!!ctx.profile&&String(ctx.profile.ownerId)===String(me);
  const d=ctx.data||V.defaultProfileData();
  $('profileNickV29').textContent=target; document.title=target+' - Sohbetix Profil';
  $('profileNickV29').style.color=d.nickColor||'#b51b1b'; $('profileNickV29').style.fontWeight=(ctx.vip&&d.boldNick)?'900':'800'; $('profileNickV29').style.textDecoration=(ctx.vip&&d.boldNick)?'underline':'none';
  $('profilePhotoImgV29').src=d.photo||'sohbetix-logo.jpg';
  $('profileAboutV29').textContent=d.about||'Bu kullanıcı henüz bir şey yazmadı.';
  $('profileGenderV29').textContent=d.gender==='male'?'👦 Erkek':d.gender==='female'?'👩 Bayan':'👤 Belirsiz';
  $('profileBirthV29').textContent=(d.birthDay&&d.birthMonth&&d.birthYear)?`${d.birthDay}.${d.birthMonth}.${d.birthYear}`:'—';
  $('profileCountryV29').textContent=d.country||'—'; $('profileMaritalV29').textContent=d.marital||'—';
  $('profileVipBadgeV29').hidden=!ctx.vip;
  function online(){const on=V.isNickOnline(target);$('profileOnlineV29').textContent=on?'ÇEVRİM İÇİ':'ÇEVRİM DIŞI';$('profileOnlineV29').classList.toggle('offline',!on);}
  online(); setInterval(online,15000);
  if(!isOwn){$('profileOwnerNavV29').querySelectorAll('a:not(.active),button').forEach(x=>x.hidden=true);$('profileOwnerActionsV29').hidden=true;}
  else {
    $('profileEditBtnV29').onclick=()=>location.href='profile-edit.html?nick='+encodeURIComponent(target);
    $('profilePhotoChangeV29').onclick=()=>$('profilePhotoInputV29').click();
    $('profilePhotoInputV29').onchange=()=>{
      const f=$('profilePhotoInputV29').files?.[0]; if(!f)return;
      if(f.type==='image/gif'&&!ctx.vip){alert('Hareketli GIF avatarları yalnızca VIP kullanıcılar yükleyebilir.');return;}
      if(f.size>1200000){alert('Fotoğraf en fazla 1,2 MB olabilir.');return;}
      const r=new FileReader(); r.onload=()=>{const next={...V.getProfileDataByProfile(ctx.profile),photo:String(r.result||'')};V.saveProfileData(ctx.profile.id,next);$('profilePhotoImgV29').src=next.photo;};r.readAsDataURL(f);
    };
    const modal=$('ignoredModalV29');
    function drawIgnored(){const list=V.ignored();$('ignoredListV29').innerHTML=list.length?list.map(n=>`<div class="ignored-row-v28"><span>${n}</span><button data-unignore="${n.replaceAll('&','&amp;').replaceAll('"','&quot;')}">Engeli kaldır</button></div>`).join(''):'<p>Engellenen kullanıcı yok.</p>';}
    $('profileIgnoredBtnV29').onclick=()=>{drawIgnored();modal.hidden=false;};$('ignoredCloseV29').onclick=()=>modal.hidden=true;modal.onclick=e=>{if(e.target===modal)modal.hidden=true;};
    $('ignoredListV29').onclick=e=>{const b=e.target.closest('[data-unignore]');if(!b)return;V.unignoreNick(b.dataset.unignore);drawIgnored();};
  }
})();
