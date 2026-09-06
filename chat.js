(() => {
  'use strict';

  const STORAGE_MESSAGES = 'sohbetix-v17-room-messages';
  const STORAGE_PRESENCE = 'sohbetix-v17-room-presence';
  const SESSION_NICK = 'sohbetix-v17-current-nick';
  const MAX_MESSAGES = 10000;
  const BOT_NICK = 'Sohbetix Bot';
  const BOT_PURGE_TEXT = 'Eski 10.000 tane mesaj kalıcı olarak silindi!';
  const PRESENCE_TTL = 16000;
  const HEARTBEAT_MS = 4000;
  const STORAGE_LEAVE_SEEN = 'sohbetix-v25-leave-seen';
  const SESSION_JOIN_FLAG = 'sohbetix-v25-join-announced';
  const CONFIG_KEY='sohbetix-v18-chat-config';
  const DEFAULT_CONFIG={title:'Sohbetix',language:'tr',registeredCaptcha:false,disabled:false,imageShare:false,privateMode:'entered',catalogVisible:true,description:'',category:'Arkadaşlık',slug:'sohbetix'};
  function readConfig(){try{return {...DEFAULT_CONFIG,...JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}')}}catch{return {...DEFAULT_CONFIG}}}
  const cfg=readConfig();
  const isRegistered=localStorage.getItem('sohbetix-auth-type')==='registered' && !!String(localStorage.getItem('sohbetix-auth-nick')||'').trim();

  const $ = (id) => document.getElementById(id);
  const els = {
    onlineCount: $('onlineCount'), userList: $('roomUserList'), search: $('nickSearch'), messages: $('roomMessages'),
    guestFooter: $('guestFooter'), messageForm: $('messageForm'), messageInput: $('messageInput'),
    openJoin: $('openJoinModal'), overlay: $('joinOverlay'), closeJoin: $('closeJoinModal'), guestNick: $('guestNick'),
    nickCounter: $('nickCounter'), captchaToggle: $('captchaToggle'), captchaBox: $('captchaQuestionBox'),
    captchaQuestion: $('captchaQuestion'), captchaAnswer: $('captchaAnswer'), captchaVerify: $('captchaVerify'),
    captchaStatus: $('captchaStatus'), joinBtn: $('joinChatBtn'), roomAccount: $('roomAccount'), roomAccountNick: $('roomAccountNick'),
    roomAccountBtn: $('roomAccountBtn'), roomAccountMenu: $('roomAccountMenu'), leaveBtn: $('leaveRoomBtn'), preJoinBlessing: $('preJoinBlessing'), disabledNotice:$('chatDisabledNotice'), latestMessagesBtn:$('latestMessagesBtn'), profileSaveHint:$('profileSaveHint'), accountAuthBtn:$('accountAuthBtn'),
    smileyBtn:$('smileyBtn'), emojiPanel:$('emojiPanel'), emojiGrid:$('emojiGrid'), mentionSuggest:$('mentionSuggest'), floodWarning:$('floodWarning'), floodCountdown:$('floodCountdown'), floodVipBtn:$('floodVipBtn'),
    registeredProfilePanel:$('registeredProfilePanel'), guestJoinPanel:$('guestJoinPanel'), registeredAccountEmail:$('registeredAccountEmail'),
    registeredLogoutBtn:$('registeredLogoutBtn'), savedProfilesV25:$('savedProfilesV25'), newProfileBtnV25:$('newProfileBtnV25'),
    profileEditorV25:$('profileEditorV25'), profileEditorLabelV25:$('profileEditorLabelV25'), profileNickV25:$('profileNickV25'),
    profileNickCounterV25:$('profileNickCounterV25'), profileLimitV25:$('profileLimitV25'), profileVipBtnV25:$('profileVipBtnV25'),
    profileRefreshBtn:$('profileRefreshBtn')
  };

  const clientId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let currentNick = sessionStorage.getItem(SESSION_NICK) || '';
  let captcha = null;
  let captchaPassed = false;
  let heartbeat = null;

  function safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  }
  function readMessages() { return safeParse(localStorage.getItem(STORAGE_MESSAGES), []); }
  function writeMessages(list) { localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(list)); }
  function readPresence() { return safeParse(localStorage.getItem(STORAGE_PRESENCE), {}); }
  function writePresence(obj) { localStorage.setItem(STORAGE_PRESENCE, JSON.stringify(obj)); }
  function nowTime() { return new Date().toLocaleTimeString(cfg.language==='en'?'en-GB':'tr-TR', {hour:'2-digit', minute:'2-digit'}); }
  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }
  function cleanNick(value) {
    return String(value || '').replace(/[\r\n\t]/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 24);
  }

  const AUTH_ID = String(localStorage.getItem('sohbetix-auth-id') || '');
  const AUTH_EMAIL = String(localStorage.getItem('sohbetix-auth-email') || '');
  const PROFILE_STORE_KEY = 'sohbetix-v25-chat-profiles:' + (AUTH_ID || AUTH_EMAIL || 'guest');
  let selectedProfileId = '';
  let profileMode = 'existing'; // existing | new | edit

  function readChatProfilesV25(){
    if(!isRegistered) return [];
    const raw = safeParse(localStorage.getItem(PROFILE_STORE_KEY), []);
    return Array.isArray(raw)
      ? raw.filter(x=>x && x.id && cleanNick(x.nick)).map(x=>({...x,nick:cleanNick(x.nick)})).slice(0,10)
      : [];
  }

  function writeChatProfilesV25(list){
    localStorage.setItem(PROFILE_STORE_KEY, JSON.stringify(list.slice(0,10)));
  }

  function isVipV25(){
    return localStorage.getItem('sohbetix-vip-active') === '1';
  }

  function profileLimitV25(){
    return isVipV25() ? 10 : 1;
  }

  function profileIconV25(kind){
    const map={
      edit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
      del:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M7 7l1 13h8l1-13"/></svg>',
      more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>'
    };
    return map[kind] || '';
  }

  function closeProfileMenusV25(){
    document.querySelectorAll('.profile-menu-v25').forEach(x=>x.hidden=true);
  }

  function resetCaptchaV25(){
    captcha = null;
    captchaPassed = false;
    captchaStage = 0;
    els.captchaToggle.checked = false;
    els.captchaToggle.disabled = false;
    els.captchaBox.hidden = true;
    els.captchaStatus.textContent = '';
    els.captchaStatus.className = 'captcha-status-v15';
    els.captchaAnswer.value = '';
    updateJoinEnabled();
  }

  function setProfileEditorV25(mode, profile=null){
    profileMode = mode;
    if(mode === 'existing'){
      els.profileEditorV25.hidden = true;
      els.profileLimitV25.hidden = true;
      return;
    }
    els.profileEditorV25.hidden = false;
    els.profileEditorLabelV25.textContent = mode === 'edit' ? 'Profili düzenle' : 'Yeni profil oluştur';
    els.profileNickV25.value = profile ? cleanNick(profile.nick) : '';
    els.profileNickCounterV25.textContent = Array.from(els.profileNickV25.value).length;
    els.profileLimitV25.hidden = true;
    setTimeout(()=>els.profileNickV25.focus(),40);
  }

  function renderProfilesV25(){
    if(!isRegistered || !els.savedProfilesV25) return;
    const list = readChatProfilesV25();
    if(list.length && !list.some(x=>x.id===selectedProfileId)){
      selectedProfileId = list[0].id;
      profileMode = 'existing';
    }
    if(!list.length){
      selectedProfileId = '';
      profileMode = 'new';
      setProfileEditorV25('new');
    }

    els.savedProfilesV25.innerHTML = list.map((profile,index)=>{
      const checked = profile.id===selectedProfileId && profileMode==='existing' ? 'checked' : '';
      return `<div class="saved-profile-row-v25" data-profile-id="${escapeHtml(profile.id)}">
        <label class="saved-profile-choice-v25">
          <input type="radio" name="chatProfileV25" value="${escapeHtml(profile.id)}" ${checked}/>
          <span>${escapeHtml(profile.nick)}</span>
        </label>
        <button class="profile-more-v25" type="button" data-profile-more="${escapeHtml(profile.id)}" aria-label="Profil seçenekleri">
          ${profileIconV25('more')}
        </button>
        <div class="profile-menu-v25" data-profile-menu="${escapeHtml(profile.id)}" hidden>
          <button type="button" data-profile-edit="${escapeHtml(profile.id)}">${profileIconV25('edit')}<span>Düzenle</span></button>
          <button type="button" data-profile-delete="${escapeHtml(profile.id)}">${profileIconV25('del')}<span>Sil</span></button>
        </div>
      </div>`;
    }).join('');

    updateJoinEnabled();
  }

  function selectExistingProfileV25(id){
    const list=readChatProfilesV25();
    if(!list.some(x=>x.id===id)) return;
    selectedProfileId=id;
    profileMode='existing';
    setProfileEditorV25('existing');
    resetCaptchaV25();
    renderProfilesV25();
  }

  function beginNewProfileV25(){
    selectedProfileId='';
    setProfileEditorV25('new');
    resetCaptchaV25();
    renderProfilesV25();
  }

  function beginEditProfileV25(id){
    const profile=readChatProfilesV25().find(x=>x.id===id);
    if(!profile) return;
    selectedProfileId=id;
    setProfileEditorV25('edit',profile);
    resetCaptchaV25();
    renderProfilesV25();
  }

  function deleteProfileV25(id){
    const next=readChatProfilesV25().filter(x=>x.id!==id);
    writeChatProfilesV25(next);
    if(selectedProfileId===id) selectedProfileId=next[0]?.id || '';
    if(next.length){
      profileMode='existing';
      setProfileEditorV25('existing');
    }else{
      profileMode='new';
      setProfileEditorV25('new');
    }
    resetCaptchaV25();
    renderProfilesV25();
  }

  function logoutRegisteredV25(){
    clearInterval(heartbeat);
    if(currentNick) removePresence(true);
    sessionStorage.removeItem(SESSION_NICK);
    sessionStorage.removeItem(SESSION_JOIN_FLAG);
    sessionStorage.removeItem('sohbetix-v25-open-profile');
    ['sohbetix-auth-type','sohbetix-auth-nick','sohbetix-auth-email','sohbetix-auth-id'].forEach(k=>localStorage.removeItem(k));
    location.reload();
  }

  function registeredNickCandidateV25(){
    const list=readChatProfilesV25();
    if(profileMode==='existing'){
      return cleanNick(list.find(x=>x.id===selectedProfileId)?.nick || '');
    }
    return cleanNick(els.profileNickV25?.value || '');
  }

  function saveRegisteredProfileV25(){
    const nick=registeredNickCandidateV25();
    if(!nick) return {ok:false,error:'Bir rumuz yaz.'};
    const list=readChatProfilesV25();
    const duplicate=list.some(x=>x.id!==selectedProfileId && x.nick.toLocaleLowerCase('tr-TR')===nick.toLocaleLowerCase('tr-TR'));
    if(duplicate) return {ok:false,error:'Bu profil adı zaten kayıtlı.'};

    if(profileMode==='new'){
      if(list.length>=profileLimitV25()){
        els.profileLimitV25.hidden=false;
        return {ok:false,error:'limit'};
      }
      const profile={id:(crypto?.randomUUID?.() || 'p-'+Date.now()+'-'+Math.random().toString(36).slice(2)),nick,createdAt:Date.now()};
      list.push(profile);
      writeChatProfilesV25(list);
      selectedProfileId=profile.id;
      profileMode='existing';
      return {ok:true,nick};
    }

    if(profileMode==='edit'){
      const idx=list.findIndex(x=>x.id===selectedProfileId);
      if(idx<0) return {ok:false,error:'Profil bulunamadı.'};
      list[idx]={...list[idx],nick,updatedAt:Date.now()};
      writeChatProfilesV25(list);
      profileMode='existing';
      return {ok:true,nick};
    }

    return {ok:true,nick};
  }
  function makeColor(nick) {
    let h = 0; for (const ch of nick) h = (h * 31 + ch.codePointAt(0)) % 360;
    return `hsl(${h} 70% 38%)`;
  }
  function makeAvatar(nick) {
    const first = Array.from(nick.trim())[0] || '👤';
    return /[A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(first) ? first.toLocaleUpperCase('tr-TR') : first;
  }

  function isNearMessagesBottom() {
    if (!els.messages) return true;
    return els.messages.scrollHeight - els.messages.scrollTop - els.messages.clientHeight < 72;
  }

  function updateLatestMessagesButton() {
    if (!els.latestMessagesBtn || !els.messages) return;
    if (!currentNick) { els.latestMessagesBtn.hidden = true; return; }
    const canScroll = els.messages.scrollHeight > els.messages.clientHeight + 8;
    els.latestMessagesBtn.hidden = !canScroll || isNearMessagesBottom();
  }

  function scrollToLatestMessages(smooth = true) {
    if (!els.messages) return;
    els.messages.scrollTo({top:els.messages.scrollHeight, behavior:smooth ? 'smooth' : 'auto'});
    setTimeout(updateLatestMessagesButton, smooth ? 260 : 0);
  }

  function normalizeRegisteredFlag(value) {
    return value === true || value === 1 || value === '1' || value === 'true' || value === 'registered';
  }

  function targetRegistrationByNick(nick, fallback=false) {
    const key=String(nick||'').toLocaleLowerCase('tr-TR');
    const presence=Object.values(prunePresence(readPresence()));
    const found=presence.find(u=>String(u.nick||'').toLocaleLowerCase('tr-TR')===key);
    return found ? normalizeRegisteredFlag(found.registered) : normalizeRegisteredFlag(fallback);
  }

  function iconSvg(kind) {
    const icons={
      mention:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M16 8v6a2 2 0 0 0 4 0v-2a8 8 0 1 0-2.3 5.7"/><circle cx="12" cy="12" r="3"/></svg>',
      private:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5z"/></svg>',
      profile:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
      ignore:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/></svg>'
    };
    return icons[kind]||'';
  }

  function closeUserMenu() {
    document.querySelectorAll('.sohbetix-user-menu-v20').forEach(el=>el.remove());
  }

  function toastV20(text) {
    document.querySelectorAll('.private-toast-v18').forEach(el=>el.remove());
    const t=document.createElement('div');
    t.className='private-toast-v18';
    t.textContent=text;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),2200);
  }

  function showUserMenu(nick, registered, anchor) {
    nick=cleanNick(nick);
    if(!nick || nick===BOT_NICK) return;
    closeUserMenu();
    const menu=document.createElement('div');
    menu.className='sohbetix-user-menu-v20';
    menu.setAttribute('role','menu');
    menu.innerHTML=`<div class="sohbetix-user-menu-head-v20"><span class="sohbetix-user-menu-avatar-v20" style="--user-color:${makeColor(nick)}">${escapeHtml(makeAvatar(nick))}</span><strong>${escapeHtml(nick)}</strong></div>
      <button type="button" data-action="mention">${iconSvg('mention')}<span>Bahset</span></button>
      <button type="button" data-action="private">${iconSvg('private')}<span>Gizli</span></button>
      ${registered?`<button type="button" data-action="profile">${iconSvg('profile')}<span>Profil</span></button>
      <button type="button" data-action="ignore">${iconSvg('ignore')}<span>Yoksay</span></button>`:''}`;
    document.body.appendChild(menu);
    const rect=anchor?.getBoundingClientRect?.() || {left:12,top:80,bottom:110,right:120};
    const mw=Math.min(230, window.innerWidth-16);
    menu.style.width=mw+'px';
    let left=Math.min(Math.max(8,rect.left), window.innerWidth-mw-8);
    let top=rect.bottom+6;
    const mh=menu.offsetHeight||220;
    if(top+mh>window.innerHeight-8) top=Math.max(8,rect.top-mh-6);
    menu.style.left=left+'px'; menu.style.top=top+'px';
    menu.addEventListener('click',e=>{
      const btn=e.target.closest('button[data-action]'); if(!btn)return;
      const action=btn.dataset.action;
      if(action==='mention'){
        if(!currentNick){openJoinModal(); closeUserMenu(); return;}
        const prefix='@'+nick+' ';
        const cur=els.messageInput.value||'';
        els.messageInput.value=(cur && !cur.endsWith(' ')?cur+' ':'')+prefix;
        els.messageInput.focus();
      } else if(action==='private'){
        toastV20(`${nick} için gizli sohbet seçildi.`);
      } else if(action==='profile'){
        toastV20(`${nick} profili`);
      } else if(action==='ignore' && registered){
        const key='sohbetix-v20-ignore-list';
        const list=safeParse(localStorage.getItem(key),[]);
        if(!list.includes(nick)) list.push(nick);
        localStorage.setItem(key,JSON.stringify(list));
        toastV20(`${nick} yoksayıldı.`);
      }
      closeUserMenu();
    });
  }


  function renderChatText(text) {
    const safe = escapeHtml(text || '');
    return safe.replace(/(^|\s)@([^\s<]{1,24})/g, '$1<span class="mention-tag-v23">@$2</span>');
  }

  function leaveSeenMap() { return safeParse(localStorage.getItem(STORAGE_LEAVE_SEEN), {}); }
  function announceDroppedPresence(id, item) {
    if (!item || !item.nick) return;
    const seen = leaveSeenMap();
    const key = `${id}|${Number(item.lastSeen||0)}`;
    if (seen[key]) return;
    const now = Date.now();
    for (const [k,v] of Object.entries(seen)) if (now - Number(v||0) > 10*60*1000) delete seen[k];
    seen[key] = now;
    localStorage.setItem(STORAGE_LEAVE_SEEN, JSON.stringify(seen));
    addMessage('leave', {nick:item.nick, registered:normalizeRegisteredFlag(item.registered)});
  }

  function sweepExpiredPresence(presence) {
    const now = Date.now();
    let changed = false;
    for (const [id, item] of Object.entries(presence)) {
      if (!item || now - Number(item.lastSeen || 0) > PRESENCE_TTL) {
        if (item && item.nick) announceDroppedPresence(id, item);
        delete presence[id];
        changed = true;
      }
    }
    if (changed) writePresence(presence);
    return presence;
  }

  function closeComposerPopups(except='') {
    if (els.emojiPanel && except !== 'emoji') els.emojiPanel.hidden = true;
    if (els.mentionSuggest && except !== 'mention') els.mentionSuggest.hidden = true;
  }

  function insertAtCaret(text) {
    const input = els.messageInput;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0,start) + text + input.value.slice(end);
    const pos = start + text.length;
    input.setSelectionRange(pos,pos);
    input.focus();
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function initEmojiPanelV23() {
    if (!els.emojiGrid || !els.smileyBtn) return;
    const emojis = ['😀','😃','😄','😁','😂','🤣','😊','😍','🥰','😘','😢','😭','😞','😔','☹️','🙁','😥','😓','😩','😫','🥺','😡','🤬','😎','🤗','🤔','👍','👎','❤️','💔','🔥','🎉','🌹','⭐','🙏','👏','👋','👌','💯','🎈','✨','😴','🤭','🙄','😇','🤩','🥳','😜','😋'];
    els.emojiGrid.innerHTML = emojis.map(x=>`<button type="button" data-emoji="${x}" aria-label="${x}">${x}</button>`).join('');
    els.smileyBtn.addEventListener('click', e=>{
      e.stopPropagation();
      const willOpen = els.emojiPanel.hidden;
      closeComposerPopups('emoji');
      els.emojiPanel.hidden = !willOpen;
    });
    els.emojiGrid.addEventListener('click',e=>{
      const b=e.target.closest('[data-emoji]'); if(!b)return;
      insertAtCaret(b.dataset.emoji);
    });
  }

  function currentMentionQuery() {
    const input=els.messageInput;
    const pos=input.selectionStart ?? input.value.length;
    const before=input.value.slice(0,pos);
    const m=before.match(/(?:^|\s)@([^\s@]*)$/);
    if(!m)return null;
    return {query:m[1], start:pos-m[1].length-1, end:pos};
  }

  function renderMentionSuggestions() {
    if(!els.mentionSuggest || !currentNick){ if(els.mentionSuggest)els.mentionSuggest.hidden=true; return; }
    const m=currentMentionQuery();
    if(!m){els.mentionSuggest.hidden=true;return;}
    closeComposerPopups('mention');
    const q=m.query.toLocaleLowerCase('tr-TR');
    const seen=new Set();
    const users=Object.values(prunePresence(readPresence()))
      .filter(u=>u&&u.nick)
      .filter(u=>{
        const k=String(u.nick).toLocaleLowerCase('tr-TR');
        if(seen.has(k))return false; seen.add(k); return true;
      })
      .filter(u=>!q||String(u.nick).toLocaleLowerCase('tr-TR').includes(q))
      .slice(0,40);
    if(!users.length){els.mentionSuggest.hidden=true;return;}
    els.mentionSuggest.innerHTML=users.map(u=>`<button type="button" data-mention="${escapeHtml(u.nick)}"><span class="room-mini-avatar-v15" style="--user-color:${makeColor(u.nick)}">${escapeHtml(makeAvatar(u.nick))}</span><b>${escapeHtml(u.nick)}</b></button>`).join('');
    els.mentionSuggest.hidden=false;
  }

  function chooseMention(nick) {
    const m=currentMentionQuery();
    if(!m)return;
    const input=els.messageInput;
    input.value=input.value.slice(0,m.start)+'@'+nick+' '+input.value.slice(m.end);
    const pos=m.start+nick.length+2;
    input.setSelectionRange(pos,pos);
    input.focus();
    els.mentionSuggest.hidden=true;
  }

  function addMessage(type, data = {}) {
    let list = readMessages();
    if (data.nick && data.registered === undefined && data.nick === currentNick) data.registered = isRegistered;
    list.push({id:`m-${Date.now()}-${Math.random().toString(36).slice(2)}`, type, at:Date.now(), time:nowTime(), ...data});

    // 10.000 normal sohbet mesajına ulaşıldığında eski geçmişi tamamen temizle.
    // Katılma/ayrılma ve bot bildirimleri 10.000 sayacına dahil edilmez.
    const normalMessageCount = list.reduce((count, item) => count + (item.type === 'chat' ? 1 : 0), 0);
    if (normalMessageCount >= MAX_MESSAGES) {
      list = [{
        id:`m-${Date.now()}-sohbetix-bot-purge`,
        type:'bot',
        nick:BOT_NICK,
        text:BOT_PURGE_TEXT,
        at:Date.now(),
        time:nowTime()
      }];
    }

    writeMessages(list);
    renderMessages(data.nick === currentNick);
  }

  function renderMessages(forceBottom = false) {
    const list = readMessages();
    const wasNearBottom = isNearMessagesBottom();
    const previousScrollTop = els.messages.scrollTop;
    if (!list.length) {
      els.messages.innerHTML = '<div class="room-empty-v15">Sohbet henüz boş. İlk katılan sen olabilirsin.</div>';
      return;
    }
    els.messages.innerHTML = list.map(msg => {
      const registered = targetRegistrationByNick(msg.nick, msg.registered);
      if (msg.type === 'join') {
        return `<div class="system-message-v15 user-target-v20" data-user-nick="${escapeHtml(msg.nick||'')}" data-user-registered="${registered?'1':'0'}"><button class="system-nick-v15" type="button">@${escapeHtml(msg.nick)}</button> <span>${cfg.language==='en'?'joined us...':'bize katılıyor...'}</span> <small>${escapeHtml(msg.time || '')}</small></div>`;
      }
      if (msg.type === 'leave') {
        return `<div class="system-message-v15 leave user-target-v20" data-user-nick="${escapeHtml(msg.nick||'')}" data-user-registered="${registered?'1':'0'}"><button class="system-nick-v15" type="button">@${escapeHtml(msg.nick)}</button> <span>${cfg.language==='en'?'left us...':'bizi terk ediyor...'}</span> <small>${escapeHtml(msg.time || '')}</small></div>`;
      }
      if (msg.type === 'bot') {
        return `<article class="bot-message-v17"><div class="bot-avatar-v17">S</div><div class="bot-message-body-v17"><div class="bot-message-meta-v17"><b>${escapeHtml(BOT_NICK)}</b><small>${escapeHtml(msg.time || '')}</small></div><p>${escapeHtml(msg.text || BOT_PURGE_TEXT)}</p></div></article>`;
      }
      if(msg.type==='image') return `<article class="live-message-v15 user-target-v20" data-user-nick="${escapeHtml(msg.nick||'')}" data-user-registered="${registered?'1':'0'}"><div class="live-avatar-v15" style="--user-color:${makeColor(msg.nick||'')}">${escapeHtml(makeAvatar(msg.nick||''))}</div><div class="live-message-body-v15"><div class="live-message-meta-v15"><b style="color:${makeColor(msg.nick||'')}">${escapeHtml(msg.nick||'')}</b><small>${escapeHtml(msg.time||'')}</small></div><img class="live-image-v18" src="${escapeHtml(msg.data||'')}" alt="Paylaşılan resim"></div></article>`;
      return `<article class="live-message-v15 user-target-v20" data-user-nick="${escapeHtml(msg.nick||'')}" data-user-registered="${registered?'1':'0'}"><div class="live-avatar-v15" style="--user-color:${makeColor(msg.nick || '')}">${escapeHtml(makeAvatar(msg.nick || ''))}</div><div class="live-message-body-v15"><div class="live-message-meta-v15"><b style="color:${makeColor(msg.nick || '')}">${escapeHtml(msg.nick || '')}</b><small>${escapeHtml(msg.time || '')}</small></div><p>${renderChatText(msg.text || '')}</p></div></article>`;
    }).join('');
    if (forceBottom || wasNearBottom) els.messages.scrollTop = els.messages.scrollHeight;
    else els.messages.scrollTop = previousScrollTop;
    requestAnimationFrame(updateLatestMessagesButton);
  }

  function prunePresence(presence) {
    const now = Date.now();
    for (const [id, item] of Object.entries(presence)) {
      if (!item || now - Number(item.lastSeen || 0) > PRESENCE_TTL) delete presence[id];
    }
    return presence;
  }

  function renderPresence() {
    let presence = sweepExpiredPresence(readPresence());
    writePresence(presence);
    const q = (els.search.value || '').toLocaleLowerCase('tr-TR').trim();
    const users = Object.values(presence).sort((a,b) => String(a.nick).localeCompare(String(b.nick), 'tr'));
    els.onlineCount.textContent = cfg.language==='en'?`${users.length} online`:`${users.length} çevrimiçi`;
    const filtered = users.filter(u => !q || String(u.nick).toLocaleLowerCase('tr-TR').includes(q));
    const botMatches = !q || BOT_NICK.toLocaleLowerCase('tr-TR').includes(q);
    const botRow = botMatches ? `<li class="room-bot-user-v17"><span class="room-mini-avatar-v15 room-bot-avatar-v17">S</span><b>${escapeHtml(BOT_NICK)}</b></li>` : '';
    els.userList.innerHTML = botRow + filtered.map(u => `<li class="user-target-v20" data-user-nick="${escapeHtml(u.nick||'')}" data-user-registered="${normalizeRegisteredFlag(u.registered)?'1':'0'}"><span class="room-mini-avatar-v15" style="--user-color:${makeColor(u.nick)}">${escapeHtml(makeAvatar(u.nick))}</span><b style="color:${makeColor(u.nick)}">${escapeHtml(u.nick)}</b></li>`).join('');
  }

  function heartbeatPresence() {
    if (!currentNick) return;
    const presence = prunePresence(readPresence());
    presence[clientId] = {nick:currentNick, registered:isRegistered, lastSeen:Date.now()};
    writePresence(presence);
    renderPresence();
  }

  function startHeartbeat() {
    clearInterval(heartbeat);
    heartbeatPresence();
    heartbeat = setInterval(heartbeatPresence, HEARTBEAT_MS);
  }

  function removePresence(announce) {
    if (!currentNick) return;
    const leavingNick = currentNick;
    const presence = prunePresence(readPresence());
    delete presence[clientId];
    writePresence(presence);
    if (announce) addMessage('leave', {nick:leavingNick, registered:isRegistered});
    renderPresence();
  }

  function setLoggedInState(on) {
    els.guestFooter.hidden = on;
    els.messageForm.hidden = !on;
    els.roomAccount.hidden = !on;
    if (els.preJoinBlessing) els.preJoinBlessing.hidden = on;
    document.body.classList.toggle('room-not-joined-v21', !on);
    if (els.profileSaveHint) els.profileSaveHint.hidden = !!isRegistered;
    if (on) {
      els.roomAccountNick.textContent = currentNick;
      setTimeout(() => els.messageInput.focus(), 50);
    }
  }

  function openJoinModal() {
    if(cfg.disabled)return;
    els.overlay.hidden = false;
    captchaPassed = false;
    captchaStage = 0;
    els.captchaToggle.checked = false;
    els.captchaToggle.disabled = false;
    els.captchaBox.hidden = true;
    els.captchaStatus.textContent = '';
    els.captchaAnswer.value = '';
    els.joinBtn.disabled = true;

    if(isRegistered){
      els.registeredProfilePanel.hidden = false;
      els.guestJoinPanel.hidden = true;
      els.registeredAccountEmail.textContent = AUTH_EMAIL || localStorage.getItem('sohbetix-auth-nick') || 'Sohbetix hesabı';
      renderProfilesV25();
      if(readChatProfilesV25().length && profileMode!=='edit' && profileMode!=='new'){
        profileMode='existing';
        setProfileEditorV25('existing');
      }
    }else{
      els.registeredProfilePanel.hidden = true;
      els.guestJoinPanel.hidden = false;
      els.guestNick.value = '';
      els.guestNick.placeholder=cfg.language==='en'?'Nickname':'Misafir rumuzu';
      els.nickCounter.textContent='0/24';
    }

    updateJoinEnabled();
    setTimeout(()=>{
      if(isRegistered && !els.profileEditorV25.hidden) els.profileNickV25.focus();
      else if(!isRegistered) els.guestNick.focus();
    },50);
  }

  function closeJoinModal() { els.overlay.hidden = true; closeProfileMenusV25(); }

  const captchaQuestions = (() => {
    const bank = [];
    // 1,500 unique addition questions
    for (let a=11;a<=60;a++) for (let b=2;b<=31;b++) bank.push({q:`${a} + ${b} kaç eder?`,a:String(a+b)});
    // 1,200 unique subtraction questions
    for (let a=41;a<=80;a++) for (let b=2;b<=31;b++) bank.push({q:`${a} - ${b} kaç eder?`,a:String(a-b)});
    // 720 unique multiplication questions
    for (let a=2;a<=25;a++) for (let b=2;b<=31;b++) bank.push({q:`${a} × ${b} kaç eder?`,a:String(a*b)});
    // Extra logic/general questions
    bank.push(
      {q:'Türkiye’nin başkenti nedir?',a:'ankara'},
      {q:'Bir haftada kaç gün vardır?',a:'7'},
      {q:'“robot” kelimesini tersten yaz.',a:'tobor'},
      {q:'Pazartesiden sonra hangi gün gelir?',a:'salı'},
      {q:'2, 4, 6, 8, ? dizisini tamamla.',a:'10'},
      {q:'KIRMIZI kelimesini küçük harfle yaz.',a:'kırmızı'}
    );
    return bank;
  })();
  let captchaStage = 0;
  const CAPTCHA_REQUIRED_STAGES = 1;
  function newCaptcha() {
    captcha = captchaQuestions[Math.floor(Math.random()*captchaQuestions.length)];
    els.captchaQuestion.textContent = captcha.q;
    els.captchaAnswer.value = '';
  }
  function normalizeAnswer(v) { return String(v || '').trim().toLocaleLowerCase('tr-TR'); }
  function updateJoinEnabled() {
    if(isRegistered){
      const nick=registeredNickCandidateV25();
      if(els.profileNickCounterV25 && !els.profileEditorV25.hidden){
        els.profileNickCounterV25.textContent=Array.from(cleanNick(els.profileNickV25.value)).length;
      }
      els.joinBtn.disabled=!(nick.length>0 && captchaPassed);
      return;
    }
    const nick = cleanNick(els.guestNick.value);
    els.nickCounter.textContent = `${Array.from(nick).length}/24`;
    els.joinBtn.disabled = !(nick.length > 0 && captchaPassed);
  }

  function verifyCaptcha() {
    if (!captcha) return;
    const ok = normalizeAnswer(els.captchaAnswer.value) === normalizeAnswer(captcha.a);
    if (ok) {
      captchaStage += 1;
      if (captchaStage >= CAPTCHA_REQUIRED_STAGES) {
        captchaPassed = true;
        els.captchaToggle.checked = true;
        els.captchaToggle.disabled = true;
        els.captchaStatus.textContent = '✓ Güvenlik doğrulaması tamamlandı.';
        els.captchaStatus.className = 'captcha-status-v15 ok';
        els.captchaBox.hidden = true;
      } else {
        captchaPassed = false;
        els.captchaStatus.textContent = '✓ Güvenlik doğrulaması tamamlandı.';
        els.captchaStatus.className = 'captcha-status-v15 ok';
        newCaptcha();
        setTimeout(() => els.captchaAnswer.focus(), 20);
      }
    } else {
      captchaPassed = false;
      captchaStage = 0;
      els.captchaStatus.textContent = 'Cevap yanlış. Yeni bir güvenlik sorusu oluşturuldu.';
      els.captchaStatus.className = 'captcha-status-v15 error';
      newCaptcha();
    }
    updateJoinEnabled();
  }

  function joinRoom() {
    if(cfg.disabled || !captchaPassed) return;

    let nick='';
    if(isRegistered){
      const saved=saveRegisteredProfileV25();
      if(!saved.ok){
        if(saved.error && saved.error!=='limit') toastV20(saved.error);
        updateJoinEnabled();
        return;
      }
      nick=saved.nick;
      renderProfilesV25();
    }else{
      nick=cleanNick(els.guestNick.value);
    }

    if(!nick) return;
    currentNick = nick;
    sessionStorage.setItem(SESSION_NICK, currentNick);
    sessionStorage.removeItem('sohbetix-v25-open-profile');
    closeJoinModal();
    setLoggedInState(true);
    startHeartbeat();
    sessionStorage.setItem(SESSION_JOIN_FLAG, currentNick);
    addMessage('join', {nick:currentNick, registered:isRegistered});
    renderPresence();
  }

  function leaveRoom() {
    if (!currentNick) return;
    clearInterval(heartbeat);
    removePresence(true);
    sessionStorage.removeItem(SESSION_NICK);
    sessionStorage.removeItem(SESSION_JOIN_FLAG);
    currentNick = '';
    setLoggedInState(false);
    els.roomAccountMenu.hidden = true;
    renderPresence();
    if(isRegistered) setTimeout(openJoinModal, 60);
  }

  if (els.accountAuthBtn) els.accountAuthBtn.addEventListener('click', () => {
    const ret = 'open-chat.html' + (location.search || '');
    sessionStorage.setItem('sohbetix-auth-entry-v25', String(Date.now()));
    location.href = 'auth.html?return=' + encodeURIComponent(ret);
  });
  if(els.registeredLogoutBtn) els.registeredLogoutBtn.addEventListener('click', logoutRegisteredV25);
  if(els.profileVipBtnV25) els.profileVipBtnV25.addEventListener('click',()=>{ location.href='coins.html#vip'; });
  if(els.profileRefreshBtn) els.profileRefreshBtn.addEventListener('click',()=>{ renderProfilesV25(); resetCaptchaV25(); });
  if(els.newProfileBtnV25) els.newProfileBtnV25.addEventListener('click',beginNewProfileV25);
  if(els.profileNickV25) els.profileNickV25.addEventListener('input',()=>{ els.profileLimitV25.hidden=true; updateJoinEnabled(); });

  if(els.savedProfilesV25){
    els.savedProfilesV25.addEventListener('change',e=>{
      const radio=e.target.closest('input[name="chatProfileV25"]');
      if(radio) selectExistingProfileV25(radio.value);
    });
    els.savedProfilesV25.addEventListener('click',e=>{
      const more=e.target.closest('[data-profile-more]');
      if(more){
        e.stopPropagation();
        const id=more.dataset.profileMore;
        const menu=els.savedProfilesV25.querySelector(`[data-profile-menu="${CSS.escape(id)}"]`);
        const wasOpen=menu && !menu.hidden;
        closeProfileMenusV25();
        if(menu) menu.hidden=wasOpen;
        return;
      }
      const edit=e.target.closest('[data-profile-edit]');
      if(edit){ e.stopPropagation(); closeProfileMenusV25(); beginEditProfileV25(edit.dataset.profileEdit); return; }
      const del=e.target.closest('[data-profile-delete]');
      if(del){ e.stopPropagation(); closeProfileMenusV25(); deleteProfileV25(del.dataset.profileDelete); return; }
    });
  }

  els.openJoin.addEventListener('click', openJoinModal);
  els.closeJoin.addEventListener('click', closeJoinModal);
  els.overlay.addEventListener('click', e => { if (e.target === els.overlay) closeJoinModal(); });
  els.guestNick.addEventListener('input',()=>{ if(!isRegistered) updateJoinEnabled(); });
  els.search.addEventListener('input', renderPresence);
  els.captchaToggle.addEventListener('change', () => {
    if (captchaPassed) return;
    if (els.captchaToggle.checked) {
      newCaptcha();
      els.captchaBox.hidden = false;
      setTimeout(() => els.captchaAnswer.focus(), 20);
    } else {
      els.captchaBox.hidden = true;
    }
  });
  els.captchaVerify.addEventListener('click', verifyCaptcha);
  els.captchaAnswer.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); verifyCaptcha(); } });
  els.joinBtn.addEventListener('click', joinRoom);
  els.guestNick.addEventListener('keydown', e => { if (e.key === 'Enter' && !els.joinBtn.disabled) { e.preventDefault(); joinRoom(); } });

  const FLOOD_WINDOW_MS = 10000;
  const FLOOD_MAX_MESSAGES = 3;
  const STORAGE_FLOOD_STATE = 'sohbetix-v25-flood-state';
  let floodTimer = null;

  function normalizeFloodText(v){
    return String(v||'')
      .toLocaleLowerCase('tr-TR')
      .replace(/\s+/g,' ')
      .replace(/[^\p{L}\p{N}\s]/gu,'')
      .trim();
  }

  function floodSimilarity(a,b){
    a=normalizeFloodText(a); b=normalizeFloodText(b);
    if(!a || !b) return 0;
    if(a===b) return 1;
    const short=a.length<=b.length?a:b, long=a.length>b.length?a:b;
    if(long.includes(short) && short.length>=2) return short.length/long.length;
    const aa=new Set(a.split(' ').filter(Boolean)), bb=new Set(b.split(' ').filter(Boolean));
    if(!aa.size || !bb.size) return 0;
    let common=0;
    for(const x of aa) if(bb.has(x)) common++;
    return common/Math.max(aa.size,bb.size);
  }

  function readFloodState(){
    try{
      const x=JSON.parse(sessionStorage.getItem(STORAGE_FLOOD_STATE)||'{}');
      return {
        events:Array.isArray(x.events)?x.events:[],
        lastText:String(x.lastText||''),
        blockUntil:Number(x.blockUntil||0)
      };
    }catch{
      return {events:[],lastText:'',blockUntil:0};
    }
  }

  function writeFloodState(s){
    sessionStorage.setItem(STORAGE_FLOOD_STATE,JSON.stringify(s));
  }

  function hideFloodWarning(){
    if(els.floodWarning) els.floodWarning.hidden=true;
    if(els.floodCountdown) els.floodCountdown.textContent='';
    if(floodTimer){clearInterval(floodTimer);floodTimer=null;}
  }

  function showFloodWarning(blockUntil){
    if(!els.floodWarning) return;
    els.floodWarning.hidden=false;
    if(floodTimer) clearInterval(floodTimer);
    const update=()=>{
      const left=Math.max(0,Number(blockUntil)-Date.now());
      if(els.floodCountdown){
        els.floodCountdown.textContent=left>0 ? `Kalan süre: ${Math.ceil(left/1000)} sn` : '';
      }
      if(left<=0) hideFloodWarning();
    };
    update();
    floodTimer=setInterval(update,250);
  }

  function checkFloodBeforeSend(text){
    const now=Date.now();
    const state=readFloodState();
    state.events=state.events.filter(t=>now-Number(t)<FLOOD_WINDOW_MS);

    if(state.blockUntil>now){
      writeFloodState(state);
      showFloodWarning(state.blockUntil);
      return false;
    }

    const similar=state.lastText && floodSimilarity(text,state.lastText)>=0.78;
    const burst=state.events.length>=FLOOD_MAX_MESSAGES;

    if(similar || burst){
      state.blockUntil=now+FLOOD_WINDOW_MS;
      writeFloodState(state);
      showFloodWarning(state.blockUntil);
      return false;
    }

    state.events.push(now);
    state.lastText=String(text||'').slice(0,512);
    state.blockUntil=0;
    writeFloodState(state);
    hideFloodWarning();
    return true;
  }

  if(els.floodVipBtn){
    els.floodVipBtn.addEventListener('click',()=>{
      location.href='coins.html#vip';
    });
  }

  els.messageForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = els.messageInput.value.trim();
    if (!currentNick || !text) return;
    if (!checkFloodBeforeSend(text)) return;
    addMessage('chat', {nick:currentNick, text:text.slice(0,512)});
    els.messageInput.value = '';
    els.messageInput.focus();
    if(els.mentionSuggest) els.mentionSuggest.hidden=true;
  });
  els.messageInput.addEventListener('input', renderMentionSuggestions);
  els.messageInput.addEventListener('click', renderMentionSuggestions);
  els.messageInput.addEventListener('keyup', e => { if(e.key==='@' || e.key==='ArrowLeft' || e.key==='ArrowRight') renderMentionSuggestions(); });
  if(els.mentionSuggest) els.mentionSuggest.addEventListener('click',e=>{
    const b=e.target.closest('[data-mention]'); if(!b)return;
    e.preventDefault(); chooseMention(b.dataset.mention);
  });
  els.messageInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeComposerPopups();
    if (e.key === 'Enter' && !e.shiftKey && (!els.mentionSuggest || els.mentionSuggest.hidden)) { e.preventDefault(); els.messageForm.requestSubmit(); }
  });
  els.messageInput.addEventListener('paste', e => {
    const items=[...(e.clipboardData?.items||[])]; const image=items.find(i=>i.type&&i.type.startsWith('image/')); if(!image)return;
    e.preventDefault(); if(!cfg.imageShare){alert(cfg.language==='en'?'Image sharing is disabled in this chat.':'Bu sohbette resim paylaşımı kapalı.');return;}
    const file=image.getAsFile(); if(!file)return; if(file.size>900000){alert(cfg.language==='en'?'Image is too large. Maximum 900 KB.':'Resim çok büyük. En fazla 900 KB.');return;}
    const reader=new FileReader(); reader.onload=()=>{try{addMessage('image',{nick:currentNick,data:String(reader.result||'')});}catch{alert('Resim kaydedilemedi.');}}; reader.readAsDataURL(file);
  });
  els.roomAccountBtn.addEventListener('click', e => { e.stopPropagation(); els.roomAccountMenu.hidden = !els.roomAccountMenu.hidden; });
  els.leaveBtn.addEventListener('click', leaveRoom);
  document.addEventListener('click', () => { els.roomAccountMenu.hidden = true; });
  window.addEventListener('storage', e => {
    if (e.key === STORAGE_MESSAGES) renderMessages();
    if (e.key === STORAGE_PRESENCE) renderPresence();
  });
  window.addEventListener('pagehide', () => {
    if (!currentNick) return;
    const presence = readPresence();
    const item = presence[clientId];
    delete presence[clientId];
    writePresence(presence);
    if (item && sessionStorage.getItem(SESSION_JOIN_FLAG) === currentNick) {
      sessionStorage.removeItem(SESSION_JOIN_FLAG);
      addMessage('leave', {nick:currentNick, registered:isRegistered});
    }
  });

  window.addEventListener('beforeunload', () => {
    if (!currentNick) return;
    const presence = readPresence();
    delete presence[clientId];
    writePresence(presence);
    if (sessionStorage.getItem(SESSION_JOIN_FLAG) === currentNick) {
      sessionStorage.removeItem(SESSION_JOIN_FLAG);
      const list = readMessages();
      list.push({id:`m-${Date.now()}-leave`, type:'leave', nick:currentNick, registered:isRegistered, at:Date.now(), time:nowTime()});
      writeMessages(list);
    }
  });

  document.title=(cfg.title||'Sohbetix')+(cfg.language==='en'?' Chat':' Sohbet');
  const titleBtn=document.getElementById('roomTitleBtn'); if(titleBtn) titleBtn.firstChild.nodeValue=(cfg.title||'Sohbetix')+' ';
  const tab=document.querySelector('.room-tabs-v15 button'); if(tab)tab.textContent=cfg.language==='en'?'Home':'Ana sayfa';
  els.search.placeholder=cfg.language==='en'?'Nickname search':'Rumuz ara'; els.openJoin.textContent=cfg.language==='en'?'Enter chat':'Sohbete gir'; els.joinBtn.textContent=cfg.language==='en'?'Enter chat':'Sohbete gir'; els.messageInput.placeholder=cfg.language==='en'?'Write a message...':'Mesajını yaz...';
  if(cfg.disabled){if(els.disabledNotice){els.disabledNotice.hidden=false;els.disabledNotice.textContent=cfg.language==='en'?'This chat is temporarily disabled.':'Bu sohbet geçici olarak devre dışı bırakıldı.';}els.guestFooter.hidden=true;els.messageForm.hidden=true;}
  els.userList.addEventListener('click',e=>{const li=e.target.closest('.user-target-v20');if(!li)return;e.stopPropagation();showUserMenu(li.dataset.userNick,li.dataset.userRegistered==='1',li);});
  els.messages.addEventListener('click',e=>{const row=e.target.closest('.user-target-v20');if(!row)return;e.stopPropagation();showUserMenu(row.dataset.userNick,row.dataset.userRegistered==='1',row);});
  els.messages.addEventListener('scroll',updateLatestMessagesButton,{passive:true});
  if(els.latestMessagesBtn) els.latestMessagesBtn.addEventListener('click',()=>scrollToLatestMessages(true));
  document.addEventListener('click',e=>{
    if(!e.target.closest('.sohbetix-user-menu-v20'))closeUserMenu();
    if(!e.target.closest('.saved-profile-row-v25'))closeProfileMenusV25();
    if(!e.target.closest('.emoji-panel-v23') && !e.target.closest('#smileyBtn')) {
      if(els.emojiPanel) els.emojiPanel.hidden=true;
    }
    if(!e.target.closest('.mention-suggest-v23') && !e.target.closest('#messageInput')) {
      if(els.mentionSuggest) els.mentionSuggest.hidden=true;
    }
  });
  initEmojiPanelV23();
  renderMessages();
  renderPresence();
  if (currentNick) {
    setLoggedInState(true);
    startHeartbeat();
    if (sessionStorage.getItem(SESSION_JOIN_FLAG) !== currentNick) {
      sessionStorage.setItem(SESSION_JOIN_FLAG, currentNick);
      addMessage('join', {nick:currentNick, registered:isRegistered});
    }
  } else {
    setLoggedInState(false);
    if(isRegistered || sessionStorage.getItem('sohbetix-v25-open-profile')==='1'){
      setTimeout(openJoinModal, 60);
    }
  }
})();


/* V18 mobile viewport fix: keeps header/users/composer fixed and lets only messages scroll. */
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('room-fixed-viewport');

  let raf = 0;
  function syncRoomViewport() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const vv = window.visualViewport;
      const height = vv ? vv.height : window.innerHeight;
      const top = vv ? vv.offsetTop : 0;
      root.style.setProperty('--room-viewport-height', `${Math.max(320, Math.round(height))}px`);
      root.style.setProperty('--room-viewport-top', `${Math.max(0, Math.round(top))}px`);
    });
  }

  syncRoomViewport();
  window.addEventListener('resize', syncRoomViewport, {passive:true});
  window.addEventListener('orientationchange', syncRoomViewport, {passive:true});
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncRoomViewport, {passive:true});
    window.visualViewport.addEventListener('scroll', syncRoomViewport, {passive:true});
  }

  const input = document.getElementById('messageInput');
  if (input) {
    input.addEventListener('focus', () => setTimeout(syncRoomViewport, 60));
    input.addEventListener('blur', () => setTimeout(syncRoomViewport, 60));
  }
})();
