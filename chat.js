(() => {
  'use strict';

  const STORAGE_MESSAGES = 'sohbetix-v17-room-messages';
  const STORAGE_PRESENCE = 'sohbetix-v17-room-presence';
  const SESSION_NICK = 'sohbetix-v17-current-nick';
  const MAX_MESSAGES = 10000;
  const BOT_NICK = 'Sohbetix Bot';
  const BOT_PURGE_TEXT = 'Eski 10.000 tane mesaj kalıcı olarak silindi!';
  const PRESENCE_TTL = 16000;
  const HEARTBEAT_MS = 5000;
  const CONFIG_KEY='sohbetix-v18-chat-config';
  const DEFAULT_CONFIG={title:'Sohbetix',language:'tr',registeredCaptcha:false,disabled:false,imageShare:false,privateMode:'entered',catalogVisible:true,description:'',category:'Arkadaşlık',slug:'sohbetix'};
  function readConfig(){try{return {...DEFAULT_CONFIG,...JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}')}}catch{return {...DEFAULT_CONFIG}}}
  const cfg=readConfig();
  const isRegistered=localStorage.getItem('sohbetix-auth-type')==='registered';

  const $ = (id) => document.getElementById(id);
  const els = {
    onlineCount: $('onlineCount'), userList: $('roomUserList'), search: $('nickSearch'), messages: $('roomMessages'),
    guestFooter: $('guestFooter'), messageForm: $('messageForm'), messageInput: $('messageInput'),
    openJoin: $('openJoinModal'), overlay: $('joinOverlay'), closeJoin: $('closeJoinModal'), guestNick: $('guestNick'),
    nickCounter: $('nickCounter'), captchaToggle: $('captchaToggle'), captchaBox: $('captchaQuestionBox'),
    captchaQuestion: $('captchaQuestion'), captchaAnswer: $('captchaAnswer'), captchaVerify: $('captchaVerify'),
    captchaStatus: $('captchaStatus'), joinBtn: $('joinChatBtn'), roomAccount: $('roomAccount'), roomAccountNick: $('roomAccountNick'),
    roomAccountBtn: $('roomAccountBtn'), roomAccountMenu: $('roomAccountMenu'), leaveBtn: $('leaveRoomBtn'), preJoinBlessing: $('preJoinBlessing'), disabledNotice:$('chatDisabledNotice')
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
  function makeColor(nick) {
    let h = 0; for (const ch of nick) h = (h * 31 + ch.codePointAt(0)) % 360;
    return `hsl(${h} 70% 38%)`;
  }
  function makeAvatar(nick) {
    const first = Array.from(nick.trim())[0] || '👤';
    return /[A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(first) ? first.toLocaleUpperCase('tr-TR') : first;
  }

  function addMessage(type, data = {}) {
    let list = readMessages();
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
    renderMessages();
  }

  function renderMessages() {
    const list = readMessages();
    if (!list.length) {
      els.messages.innerHTML = '<div class="room-empty-v15">Sohbet henüz boş. İlk katılan sen olabilirsin.</div>';
      return;
    }
    els.messages.innerHTML = list.map(msg => {
      if (msg.type === 'join') {
        return `<div class="system-message-v15"><button class="system-nick-v15" type="button">@${escapeHtml(msg.nick)}</button> <span>${cfg.language==='en'?'joined us...':'bize katılıyor...'}</span> <small>${escapeHtml(msg.time || '')}</small></div>`;
      }
      if (msg.type === 'leave') {
        return `<div class="system-message-v15 leave"><button class="system-nick-v15" type="button">@${escapeHtml(msg.nick)}</button> <span>${cfg.language==='en'?'left us...':'bizi terk ediyor...'}</span> <small>${escapeHtml(msg.time || '')}</small></div>`;
      }
      if (msg.type === 'bot') {
        return `<article class="bot-message-v17"><div class="bot-avatar-v17">S</div><div class="bot-message-body-v17"><div class="bot-message-meta-v17"><b>${escapeHtml(BOT_NICK)}</b><small>${escapeHtml(msg.time || '')}</small></div><p>${escapeHtml(msg.text || BOT_PURGE_TEXT)}</p></div></article>`;
      }
      if(msg.type==='image') return `<article class="live-message-v15"><div class="live-avatar-v15" style="--user-color:${makeColor(msg.nick||'')}">${escapeHtml(makeAvatar(msg.nick||''))}</div><div class="live-message-body-v15"><div class="live-message-meta-v15"><b style="color:${makeColor(msg.nick||'')}">${escapeHtml(msg.nick||'')}</b><small>${escapeHtml(msg.time||'')}</small></div><img class="live-image-v18" src="${escapeHtml(msg.data||'')}" alt="Paylaşılan resim"></div></article>`;
      return `<article class="live-message-v15"><div class="live-avatar-v15" style="--user-color:${makeColor(msg.nick || '')}">${escapeHtml(makeAvatar(msg.nick || ''))}</div><div class="live-message-body-v15"><div class="live-message-meta-v15"><b style="color:${makeColor(msg.nick || '')}">${escapeHtml(msg.nick || '')}</b><small>${escapeHtml(msg.time || '')}</small></div><p>${escapeHtml(msg.text || '')}</p></div></article>`;
    }).join('');
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function prunePresence(presence) {
    const now = Date.now();
    for (const [id, item] of Object.entries(presence)) {
      if (!item || now - Number(item.lastSeen || 0) > PRESENCE_TTL) delete presence[id];
    }
    return presence;
  }

  function renderPresence() {
    let presence = prunePresence(readPresence());
    writePresence(presence);
    const q = (els.search.value || '').toLocaleLowerCase('tr-TR').trim();
    const users = Object.values(presence).sort((a,b) => String(a.nick).localeCompare(String(b.nick), 'tr'));
    els.onlineCount.textContent = cfg.language==='en'?`${users.length} online`:`${users.length} çevrimiçi`;
    const filtered = users.filter(u => !q || String(u.nick).toLocaleLowerCase('tr-TR').includes(q));
    const botMatches = !q || BOT_NICK.toLocaleLowerCase('tr-TR').includes(q);
    const botRow = botMatches ? `<li class="room-bot-user-v17"><span class="room-mini-avatar-v15 room-bot-avatar-v17">S</span><b>${escapeHtml(BOT_NICK)}</b></li>` : '';
    els.userList.innerHTML = botRow + filtered.map(u => `<li><span class="room-mini-avatar-v15" style="--user-color:${makeColor(u.nick)}">${escapeHtml(makeAvatar(u.nick))}</span><b style="color:${makeColor(u.nick)}">${escapeHtml(u.nick)}</b></li>`).join('');
  }

  function heartbeatPresence() {
    if (!currentNick) return;
    const presence = prunePresence(readPresence());
    presence[clientId] = {nick:currentNick, lastSeen:Date.now()};
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
    els.captchaAnswer.value = '';
    els.joinBtn.disabled = true;
    if(isRegistered){const saved=localStorage.getItem('sohbetix-auth-nick')||'';els.guestNick.value=saved.slice(0,24);els.guestNick.placeholder=cfg.language==='en'?'Nickname':'Rumuz';}
    if(captchaPassed){els.captchaToggle.disabled=true;els.captchaStatus.textContent=cfg.language==='en'?'Captcha not required for registered users.':'Kayıtlı kullanıcı için Captcha gerekli değil.';updateJoinEnabled();}else{els.captchaToggle.disabled=false;}
    setTimeout(() => els.guestNick.focus(), 50);
  }
  function closeJoinModal() { els.overlay.hidden = true; }

  const captchaQuestions = [
    () => { const a=2+Math.floor(Math.random()*8), b=1+Math.floor(Math.random()*7); return {q:`${a} + ${b} kaç eder?`, a:String(a+b)}; },
    () => { const a=7+Math.floor(Math.random()*8), b=1+Math.floor(Math.random()*6); return {q:`${a} - ${b} kaç eder?`, a:String(a-b)}; },
    () => ({q:'Türkiye\'nin başkenti nedir?', a:'ankara'}),
    () => ({q:'"Sohbet" kelimesinin ilk harfi nedir?', a:'s'})
  ];
  function newCaptcha() {
    captcha = captchaQuestions[Math.floor(Math.random()*captchaQuestions.length)]();
    els.captchaQuestion.textContent = captcha.q;
    els.captchaAnswer.value = '';
    els.captchaStatus.textContent = '';
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
      captchaPassed = true;
      els.captchaToggle.checked = true;
      els.captchaToggle.disabled = true;
      els.captchaStatus.textContent = '✓ Güvenlik doğrulaması tamamlandı.';
      els.captchaStatus.className = 'captcha-status-v15 ok';
      els.captchaBox.hidden = true;
    } else {
      captchaPassed = false;
      els.captchaStatus.textContent = 'Cevap yanlış. Yeni soru oluşturuldu.';
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
    addMessage('join', {nick:currentNick});
    renderPresence();
  }

  function leaveRoom() {
    if (!currentNick) return;
    clearInterval(heartbeat);
    removePresence(true);
    sessionStorage.removeItem(SESSION_NICK);
    currentNick = '';
    setLoggedInState(false);
    els.roomAccountMenu.hidden = true;
    renderPresence();
  }

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
  els.messageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); els.messageForm.requestSubmit(); }
  });
  els.messageInput.addEventListener('paste', e => {
    const items=[...(e.clipboardData?.items||[])]; const image=items.find(i=>i.type&&i.type.startsWith('image/')); if(!image)return;
    e.preventDefault(); if(!cfg.imageShare){alert(cfg.language==='en'?'Image sharing is disabled in this chat.':'Bu sohbette resim paylaşımı kapalı.');return;}
    const file=image.getAsFile(); if(!file)return; if(file.size>900000){alert(cfg.language==='en'?'Image is too large. Maximum 900 KB in this demo.':'Resim çok büyük. Bu demo sürümünde en fazla 900 KB.');return;}
    const reader=new FileReader(); reader.onload=()=>{try{addMessage('image',{nick:currentNick,data:String(reader.result||'')});}catch{alert('Resim kaydedilemedi.');}}; reader.readAsDataURL(file);
  });
  els.roomAccountBtn.addEventListener('click', e => { e.stopPropagation(); els.roomAccountMenu.hidden = !els.roomAccountMenu.hidden; });
  els.leaveBtn.addEventListener('click', leaveRoom);
  document.addEventListener('click', () => { els.roomAccountMenu.hidden = true; });
  window.addEventListener('storage', e => {
    if (e.key === STORAGE_MESSAGES) renderMessages();
    if (e.key === STORAGE_PRESENCE) renderPresence();
  });
  window.addEventListener('beforeunload', () => {
    if (!currentNick) return;
    const presence = readPresence();
    delete presence[clientId];
    writePresence(presence);
    const list = readMessages();
    list.push({id:`m-${Date.now()}-leave`, type:'leave', nick:currentNick, at:Date.now(), time:nowTime()});
    writeMessages(list);
  });

  document.title=(cfg.title||'Sohbetix')+(cfg.language==='en'?' Chat':' Sohbet');
  const titleBtn=document.getElementById('roomTitleBtn'); if(titleBtn) titleBtn.firstChild.nodeValue=(cfg.title||'Sohbetix')+' ';
  const tab=document.querySelector('.room-tabs-v15 button'); if(tab)tab.textContent=cfg.language==='en'?'Home':'Ana sayfa';
  els.search.placeholder=cfg.language==='en'?'Nickname search':'Rumuz ara'; els.openJoin.textContent=cfg.language==='en'?'Enter chat':'Sohbete gir'; els.joinBtn.textContent=cfg.language==='en'?'Enter chat':'Sohbete gir'; els.messageInput.placeholder=cfg.language==='en'?'Write a message...':'Mesajını yaz...';
  if(cfg.disabled){if(els.disabledNotice){els.disabledNotice.hidden=false;els.disabledNotice.textContent=cfg.language==='en'?'This chat is temporarily disabled.':'Bu sohbet geçici olarak devre dışı bırakıldı.';}els.guestFooter.hidden=true;els.messageForm.hidden=true;}
  els.userList.addEventListener('click',e=>{const li=e.target.closest('li');if(!li||li.classList.contains('room-bot-user-v17'))return; const allowed=cfg.privateMode==='entered'||isRegistered; const old=document.querySelector('.private-toast-v18');if(old)old.remove();const t=document.createElement('div');t.className='private-toast-v18';t.textContent=allowed?(cfg.language==='en'?'Private chat is available for this user.':'Bu kullanıcıyla özel sohbet açılabilir.'):(cfg.language==='en'?'Only registered users can use private chat.':'Özel sohbeti yalnızca kayıtlı kullanıcılar kullanabilir.');document.body.appendChild(t);setTimeout(()=>t.remove(),2200);});
  renderMessages();
  renderPresence();
  if (currentNick) {
    setLoggedInState(true);
    startHeartbeat();
  } else {
    setLoggedInState(false);
  }
})();
