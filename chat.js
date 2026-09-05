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
  const STORAGE_LEAVE_SEEN = 'sohbetix-v23-leave-seen';
  const SESSION_JOIN_FLAG = 'sohbetix-v23-join-announced';
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
    smileyBtn:$('smileyBtn'), emojiPanel:$('emojiPanel'), emojiGrid:$('emojiGrid'), gifGrid:$('gifGrid'), mentionSuggest:$('mentionSuggest')
  };

  const clientId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let currentNick = sessionStorage.getItem(SESSION_NICK) || '';
  if (!currentNick && isRegistered) {
    currentNick = cleanNick(localStorage.getItem('sohbetix-auth-nick') || '');
    if (currentNick) sessionStorage.setItem(SESSION_NICK, currentNick);
  }
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
    if (!els.emojiGrid || !els.gifGrid || !els.smileyBtn) return;
    const emojis = ['😀','😃','😄','😁','😂','🤣','😊','😍','🥰','😘','😢','😭','😞','😔','☹️','🙁','😥','😓','😩','😫','🥺','😡','🤬','😎','🤗','🤔','👍','👎','❤️','💔','🔥','🎉','🌹','⭐','🙏','👏'];
    els.emojiGrid.innerHTML = emojis.map(x=>`<button type="button" data-emoji="${x}" aria-label="${x}">${x}</button>`).join('');
    const gifs = Array.from({length:16},(_,i)=>`emoji-gif/sad-${String(i+1).padStart(2,'0')}.gif`);
    els.gifGrid.innerHTML = gifs.map((src,i)=>`<button type="button" data-gif="${src}" aria-label="Hareketli üzgün GIF ${i+1}"><img src="${src}" alt="Üzgün GIF ${i+1}" loading="lazy"></button>`).join('');
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
    els.gifGrid.addEventListener('click',e=>{
      const b=e.target.closest('[data-gif]'); if(!b)return;
      if(!currentNick){openJoinModal();return;}
      addMessage('gif',{nick:currentNick,data:b.dataset.gif});
      els.emojiPanel.hidden=true;
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
      if(msg.type==='gif') return `<article class="live-message-v15 user-target-v20" data-user-nick="${escapeHtml(msg.nick||'')}" data-user-registered="${registered?'1':'0'}"><div class="live-avatar-v15" style="--user-color:${makeColor(msg.nick||'')}">${escapeHtml(makeAvatar(msg.nick||''))}</div><div class="live-message-body-v15"><div class="live-message-meta-v15"><b style="color:${makeColor(msg.nick||'')}">${escapeHtml(msg.nick||'')}</b><small>${escapeHtml(msg.time||'')}</small></div><img class="chat-gif-v23" src="${escapeHtml(msg.data||'')}" alt="Hareketli emoji"></div></article>`;
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
    if (announce) addMessage('leave', {nick:leavingNick});
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
    captchaPassed = isRegistered && !cfg.registeredCaptcha;
    els.captchaToggle.checked = captchaPassed;
    els.captchaBox.hidden = true;
    els.captchaStatus.textContent = '';
    captchaStage = 0;
    els.captchaAnswer.value = '';
    els.joinBtn.disabled = true;
    if(isRegistered){const saved=localStorage.getItem('sohbetix-auth-nick')||'';els.guestNick.value=saved.slice(0,24);els.guestNick.placeholder=cfg.language==='en'?'Nickname':'Rumuz';}
    if(captchaPassed){els.captchaToggle.disabled=true;els.captchaStatus.textContent=cfg.language==='en'?'Captcha not required for registered users.':'Kayıtlı kullanıcı için Captcha gerekli değil.';updateJoinEnabled();}else{els.captchaToggle.disabled=false;}
    setTimeout(() => els.guestNick.focus(), 50);
  }
  function closeJoinModal() { els.overlay.hidden = true; }

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
  const CAPTCHA_REQUIRED_STAGES = 3;
  function newCaptcha() {
    captcha = captchaQuestions[Math.floor(Math.random()*captchaQuestions.length)];
    els.captchaQuestion.textContent = captcha.q;
    els.captchaAnswer.value = '';
  }
  function normalizeAnswer(v) { return String(v || '').trim().toLocaleLowerCase('tr-TR'); }
  function updateJoinEnabled() {
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
        els.captchaStatus.textContent = `${captchaStage}/${CAPTCHA_REQUIRED_STAGES} doğru. Devam etmek için sıradaki soruyu çöz.`;
        els.captchaStatus.className = 'captcha-status-v15 ok';
        newCaptcha();
        setTimeout(() => els.captchaAnswer.focus(), 20);
      }
    } else {
      captchaPassed = false;
      captchaStage = 0;
      els.captchaStatus.textContent = 'Cevap yanlış. Doğrulama sıfırlandı; üç yeni soruyu arka arkaya doğru cevapla.';
      els.captchaStatus.className = 'captcha-status-v15 error';
      newCaptcha();
    }
    updateJoinEnabled();
  }

  function joinRoom() {
    const nick = cleanNick(els.guestNick.value);
    if (!nick || !captchaPassed || cfg.disabled) return;
    currentNick = nick;
    sessionStorage.setItem(SESSION_NICK, currentNick);
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
  }

  if (els.accountAuthBtn) els.accountAuthBtn.addEventListener('click', () => {
    const ret = 'open-chat.html' + (location.search || '');
    sessionStorage.setItem('sohbetix-auth-entry-v23', String(Date.now()));
    location.href = 'auth.html?return=' + encodeURIComponent(ret);
  });
  els.openJoin.addEventListener('click', openJoinModal);
  els.closeJoin.addEventListener('click', closeJoinModal);
  els.overlay.addEventListener('click', e => { if (e.target === els.overlay) closeJoinModal(); });
  els.guestNick.addEventListener('input', updateJoinEnabled);
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
  els.messageForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = els.messageInput.value.trim();
    if (!currentNick || !text) return;
    addMessage('chat', {nick:currentNick, text:text.slice(0,512)});
    els.messageInput.value = '';
    els.messageInput.focus();
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
