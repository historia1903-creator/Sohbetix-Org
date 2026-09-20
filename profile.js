(() => {
'use strict'; const V=window.SohbetixV31,$=id=>document.getElementById(id);
const target=V.cleanNick(new URLSearchParams(location.search).get('nick')||sessionStorage.getItem('sohbetix-v17-current-nick')||'Kullanıcı');
const ctx=V.profileContext(target), me=V.currentUserId(), isOwn=!!ctx.profile&&String(ctx.profile.ownerId)===String(me), d=ctx.data||V.defaultProfileData();
$('profileNickV28').textContent=target;document.title=target+' - Sohbetix Profil';$('profileNickV28').style.color=d.nickColor||'#4B1D9A';$('profileNickV28').style.fontWeight=(ctx.vip&&d.boldNick)?'900':'800';$('profileNickV28').style.textDecoration=(ctx.vip&&d.boldNick)?'underline':'none';
$('profilePhotoImgV28').src=d.photo||'sohbetix-logo.jpg';$('profileAboutV28').textContent=d.about||'Bu kullanıcı henüz bir şey yazmadı.';$('profileGenderV28').textContent=d.gender==='male'?'👦 Erkek':d.gender==='female'?'👩 Bayan':'👤 Belirsiz';$('profileBirthV28').textContent=(d.birthDay&&d.birthMonth&&d.birthYear)?`${d.birthDay}.${d.birthMonth}.${d.birthYear}`:'—';$('profileCountryV28').textContent=d.country||'—';$('profileMaritalV28').textContent=d.marital||'—';$('profileVipBadgeV28').hidden=!ctx.vip;
function online(){const on=V.isNickOnline(target);$('profileOnlineV28').textContent=on?'ÇEVRİM İÇİ':'ÇEVRİM DIŞI';$('profileOnlineV28').classList.toggle('offline',!on);}online();setInterval(online,15000);
function refreshVipV31(){
  let fresh=V.profileContext(target);
  if(fresh.user)V.refreshVipExpiration(fresh.user);
  fresh=V.profileContext(target);
  const fd=fresh.data||V.defaultProfileData();
  $('profileVipBadgeV28').hidden=!fresh.vip;
  $('profileNickV28').style.fontWeight=(fresh.vip&&fd.boldNick)?'900':'800';
  $('profileNickV28').style.textDecoration=(fresh.vip&&fd.boldNick)?'underline':'none';
  if($('profilePhotoImgV28').src!==new URL(fd.photo||'sohbetix-logo.jpg',location.href).href)$('profilePhotoImgV28').src=fd.photo||'sohbetix-logo.jpg';
}
refreshVipV31();setInterval(refreshVipV31,1000);

if(!isOwn){$('profileOwnerNavV28').querySelectorAll('a:not(.active),button').forEach(x=>x.hidden=true);$('profileOwnerActionsV28').hidden=true;}
else{
  $('profileEditBtnV28').addEventListener('click',()=>location.href='profile-edit.html?nick='+encodeURIComponent(target));
  $('profilePhotoChangeV28').addEventListener('click',()=>$('profilePhotoInputV28').click());
  $('profilePhotoInputV28').addEventListener('change',()=>{const f=$('profilePhotoInputV28').files?.[0];if(!f)return;if(f.type==='image/gif'&&!V.isVipUser(V.refreshVipExpiration(V.profileOwnerUser(ctx.profile)))){alert('Hareketli GIF avatarları yalnızca VIP kullanıcılar yükleyebilir.');return;}if(f.size>1200000){alert('Fotoğraf en fazla 1,2 MB olabilir.');return;}const r=new FileReader();r.onload=()=>{const next={...V.getProfileDataByProfile(ctx.profile),photo:String(r.result||'')};V.saveProfileData(ctx.profile.id,next);$('profilePhotoImgV28').src=next.photo;};r.readAsDataURL(f);});
  const modal=$('ignoredModalV28');
  function drawIgnored(){const list=V.ignored();$('ignoredListV28').innerHTML=list.length?list.map(n=>`<div class="ignored-row-v28"><span>${String(n).replaceAll('&','&amp;').replaceAll('<','&lt;')}</span><button type="button" data-unignore="${String(n).replaceAll('&','&amp;').replaceAll('"','&quot;')}">Engeli kaldır</button></div>`).join(''):'<p>Engellenen kullanıcı yok.</p>';}
  $('profileIgnoredBtnV28').addEventListener('click',()=>{drawIgnored();modal.hidden=false;});$('ignoredCloseV28').addEventListener('click',()=>modal.hidden=true);modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true;});$('ignoredListV28').addEventListener('click',e=>{const b=e.target.closest('[data-unignore]');if(!b)return;V.unignoreNick(b.dataset.unignore);drawIgnored();});
}
})();
