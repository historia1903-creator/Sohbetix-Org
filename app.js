
const users = {
  alex: {
    name: "Alex", age: 36, icon: "👨", color: "red",
    location: "Amerika Birleşik Devletleri, Medford",
    status: "İlişkisi karışık",
    about: "Hayvanları seven ve amatör aşçı olan biriyim. Kedimin günlük maceraları ve güzel bir lazanya yapmak beni mutlu eder."
  },
  bella: {
    name: "Bella", age: 30, icon: "👩", color: "",
    location: "Amerika Birleşik Devletleri",
    status: "Çevrimiçi",
    about: "El işi ve sanatla ilgileniyorum. Günlük eşyaları benzersiz şeylere dönüştürmeyi ve akşamları çizim yapmayı seviyorum."
  },
  chris: {
    name: "Chris", age: 31, icon: "🧑", color: "blue",
    location: "Almanya, Berlin",
    status: "Müsait",
    about: "Oyunlar, teknoloji ve gece sohbetlerini seviyorum."
  },
  dana: {
    name: "Dana", age: 27, icon: "👩‍🦰", color: "pink",
    location: "Türkiye, İzmir",
    status: "Çevrimiçi",
    about: "Kahve, arkadaşlık ve eğlenceli sohbetleri seviyorum."
  },
  ethan: {
    name: "Ethan", age: 34, icon: "🧔", color: "",
    location: "Birleşik Krallık, Londra",
    status: "Meşgul",
    about: "Filmler, yemek ve topluluk sohbetlerini seviyorum."
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const pop = document.getElementById("userMenu");
  const profileModal = document.getElementById("profileModal");
  const usersModal = document.getElementById("usersModal");
  const giftBtn = document.getElementById("giftBtn");
  const giftMenu = document.getElementById("giftMenu");
  let activeUser = users.alex;
  let hideTimer = null;

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function showMenu(row) {
    if (!pop) return;
    clearTimeout(hideTimer);
    activeUser = users[row.dataset.user] || users.alex;
    const r = row.getBoundingClientRect();

    setText("menuName", activeUser.name);
    setText("menuPhoto", activeUser.icon);
    const menuName = document.getElementById("menuName");
    if (menuName) menuName.className = activeUser.color || "";

    pop.hidden = false;
    const menuWidth = 180;
    let left = r.left - menuWidth - 8;
    let top = r.top - 6;
    if (left < 8) left = Math.min(window.innerWidth - menuWidth - 8, r.right + 8);
    if (top < 8) top = 8;
    pop.style.left = `${Math.max(8, left)}px`;
    pop.style.top = `${top}px`;
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (pop) pop.hidden = true;
    }, 220);
  }

  document.querySelectorAll(".user-row").forEach((row) => {
    row.addEventListener("mouseenter", () => showMenu(row));
    row.addEventListener("mouseleave", scheduleHide);
    row.addEventListener("click", () => showMenu(row));
  });

  if (pop) {
    pop.addEventListener("mouseenter", () => clearTimeout(hideTimer));
    pop.addEventListener("mouseleave", scheduleHide);
  }

  const openProfile = document.getElementById("openProfile");
  if (openProfile) {
    openProfile.addEventListener("click", () => {
      setText("profileTitle", `${activeUser.name} - Sohbetix demo sohbet`);
      setText("profileName", activeUser.name);
      setText("profileAge", activeUser.age);
      setText("profileLocation", activeUser.location);
      setText("profileStatus", activeUser.status);
      setText("profileAbout", activeUser.about);
      setText("profilePicture", activeUser.icon);

      const profileName = document.getElementById("profileName");
      if (profileName) profileName.className = activeUser.color || "";

      if (profileModal) profileModal.hidden = false;
      if (pop) pop.hidden = true;
    });
  }

  const closeProfile = document.getElementById("closeProfile");
  if (closeProfile && profileModal) {
    closeProfile.addEventListener("click", () => profileModal.hidden = true);
    profileModal.addEventListener("click", (e) => {
      if (e.target === profileModal) profileModal.hidden = true;
    });
  }

  if (giftBtn && giftMenu) {
    giftBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      giftMenu.hidden = !giftMenu.hidden;
    });
    giftMenu.addEventListener("click", (e) => e.stopPropagation());
  }

  const openUsers = document.getElementById("openUsers");
  const closeUsers = document.getElementById("closeUsers");
  if (openUsers && usersModal) openUsers.addEventListener("click", () => usersModal.hidden = false);
  if (closeUsers && usersModal) closeUsers.addEventListener("click", () => usersModal.hidden = true);
  if (usersModal) {
    usersModal.addEventListener("click", (e) => {
      if (e.target === usersModal) usersModal.hidden = true;
    });
  }

  const memberSearchBtn = document.getElementById("memberSearchBtn");
  if (memberSearchBtn) {
    memberSearchBtn.addEventListener("click", () => {
      const input = document.getElementById("memberNickFilter");
      const q = (input?.value || "").trim().toLocaleLowerCase("tr-TR");
      let shown = 0;

      document.querySelectorAll(".member-card").forEach((card) => {
        const name = (card.dataset.name || "").toLocaleLowerCase("tr-TR");
        const ok = !q || name.includes(q);
        card.style.display = ok ? "grid" : "none";
        if (ok) shown++;
      });

      setText("memberCount", q ? String(shown) : "26.233");
    });
  }

  document.addEventListener("click", () => {
    if (giftMenu) giftMenu.hidden = true;
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (profileModal) profileModal.hidden = true;
      if (usersModal) usersModal.hidden = true;
      if (giftMenu) giftMenu.hidden = true;
      if (pop) pop.hidden = true;
    }
  });
});
