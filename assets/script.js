/* =========================================================
   SIDDARTHA PALACE — shared interactions
   ========================================================= */

/* ---------- Auth state in Header ---------- */
window.logoutAndRedirect = function(e) {
  if (e) e.preventDefault();
  localStorage.removeItem('sp_user');
  localStorage.removeItem('sp_admin');
  localStorage.removeItem('sp_token');
  window.location.href = 'login.html';
};

function updateHeaderAuth() {
  const userStr = localStorage.getItem('sp_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && user.full_name) {
        document.querySelectorAll('a[href="login.html"]').forEach(btn => {
          if (btn.classList.contains('btn') || btn.closest('.nav-cta')) {
            const firstName = user.full_name.split(' ')[0];
            btn.href = 'customer-dashboard.html';
            btn.innerHTML = `<span>Account (${firstName})</span>`;
          }
        });
      }
    } catch (e) {}
  }
}
updateHeaderAuth();
document.addEventListener('DOMContentLoaded', updateHeaderAuth);

/* ---------- Page loader ---------- */
window.addEventListener('load', () => {
  const l = document.querySelector('.page-loader');
  if (l) setTimeout(() => l.classList.add('hide'), 350);
});

/* ---------- Header scroll state + progress bar + back-to-top ---------- */
(function () {
  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.scroll-progress');
  const toTop = document.querySelector('.to-top');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 10);
    if (toTop) toTop.classList.toggle('show', y > 500);
    if (progress) {
      const h = document.documentElement;
      const pct = (y / (h.scrollHeight - h.clientHeight)) * 100;
      progress.style.width = pct + '%';
    }
  }, { passive: true });
  if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ---------- Mobile nav ---------- */
(function () {
  const burger = document.querySelector('.burger');
  const links = document.querySelector('.nav-links');
  if (!burger || !links) return;
  burger.addEventListener('click', () => {
    links.classList.toggle('open');
    burger.classList.toggle('open');
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
})();

/* ---------- Scroll reveal ---------- */
(function () {
  const items = document.querySelectorAll('.reveal, .reveal-stagger');
  if (!items.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
  }, { threshold: 0.15 });
  items.forEach(i => obs.observe(i));
})();

/* ---------- Count-up stats ---------- */
(function () {
  const nums = document.querySelectorAll('[data-count]');
  if (!nums.length) return;
  const animate = (el) => {
    const target = parseFloat(el.getAttribute('data-count'));
    const suffix = el.getAttribute('data-suffix') || '';
    const dur = 1400; const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target < 20 && target % 1 !== 0 ? (target * eased).toFixed(1) : Math.floor(target * eased);
      el.textContent = val + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { animate(e.target); obs.unobserve(e.target); } });
  }, { threshold: 0.5 });
  nums.forEach(n => obs.observe(n));
})();

/* ---------- Occupancy / progress bars ---------- */
(function () {
  const bars = document.querySelectorAll('.bar[data-value]');
  if (!bars.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const span = e.target.querySelector('span');
        span.style.width = e.target.getAttribute('data-value') + '%';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  bars.forEach(b => obs.observe(b));
})();

/* ---------- Button ripple ---------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const r = document.createElement('span');
  const size = Math.max(rect.width, rect.height);
  r.className = 'ripple';
  r.style.width = r.style.height = size + 'px';
  r.style.left = (e.clientX - rect.left - size / 2) + 'px';
  r.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(r);
  setTimeout(() => r.remove(), 650);
});

/* ---------- Tabs ---------- */
document.querySelectorAll('.tabs').forEach(tabgroup => {
  const target = tabgroup.getAttribute('data-target');
  const panels = document.querySelectorAll(`[data-panel-group="${target}"] .tab-panel`);
  tabgroup.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tabgroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const key = btn.getAttribute('data-tab');
      panels.forEach(p => p.classList.toggle('active', p.getAttribute('data-tab') === key));
    });
  });
});

/* ---------- FAQ accordion ---------- */
document.querySelectorAll('.acc-item').forEach(item => {
  const q = item.querySelector('.acc-q');
  const a = item.querySelector('.acc-a');
  if (!q || !a) return;
  q.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    item.closest('.accordion')?.querySelectorAll('.acc-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.acc-a').style.maxHeight = null;
    });
    if (!isOpen) {
      item.classList.add('open');
      a.style.maxHeight = a.scrollHeight + 'px';
    }
  });
});

/* ---------- Notification dropdown ---------- */
document.querySelectorAll('.notif-wrap').forEach(wrap => {
  const btn = wrap.querySelector('.btn.icon-only');
  const panel = wrap.querySelector('.notif-panel');
  if (!btn || !panel) return;
  btn.addEventListener('click', (e) => { e.stopPropagation(); panel.classList.toggle('open'); });
  document.addEventListener('click', () => panel.classList.remove('open'));
});

/* ---------- Lightbox (gallery) ---------- */
(function () {
  const lightbox = document.querySelector('.lightbox');
  if (!lightbox) return;
  const box = lightbox.querySelector('.box');
  document.querySelectorAll('[data-lightbox]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      box.innerHTML = trigger.querySelector('.art-panel')?.outerHTML || '';
      lightbox.classList.add('open');
    });
  });
  lightbox.querySelector('.close')?.addEventListener('click', () => lightbox.classList.remove('open'));
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.classList.remove('open'); });
})();

/* ---------- Filter chips (rooms page) ---------- */
document.querySelectorAll('.chip-row[data-filter-target]').forEach(row => {
  const targetSel = row.getAttribute('data-filter-target');
  row.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      row.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = chip.getAttribute('data-filter');
      document.querySelectorAll(targetSel).forEach(card => {
        const show = val === 'all' || card.getAttribute('data-type') === val;
        card.style.display = show ? '' : 'none';
      });
    });
  });
});

/* ---------- Simple client-side form validation ---------- */
function validateForm(form) {
  let ok = true;
  form.querySelectorAll('[required]').forEach(field => {
    const wrap = field.closest('.form-field');
    const valid = field.type === 'checkbox' ? field.checked : field.value.trim().length > 0;
    const emailOk = field.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
    if (!valid || !emailOk) { wrap?.classList.add('error'); ok = false; }
    else wrap?.classList.remove('error');
  });
  return ok;
}

/* =========================================================
   NEW-TAB ACTION SYSTEM
   Every interactive button that has no dedicated page opens a
   brand-styled result in a NEW browser tab, titled with the
   button's own label — e.g. clicking "Book Now" opens a tab
   titled "Book Now".
   ========================================================= */
function openResult(opts) {
  const {
    title,            // tab title = button label
    heading,          // big heading inside the tab
    message,          // supporting paragraph
    meta = [],        // array of {label, value} rows
    tone = 'gold',     // gold | ink | maroon
    icon = 'check'     // check | mail | download | bell | trash
  } = opts;

  const icons = {
    check: '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    mail: '<path d="M3 6h18v12H3z" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M3 7l9 6 9-6" stroke="currentColor" stroke-width="1.6" fill="none"/>',
    download: '<path d="M12 3v12m0 0l-5-5m5 5l5-5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 19h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    bell: '<path d="M12 3a5 5 0 00-5 5v3l-2 4h14l-2-4V8a5 5 0 00-5-5z" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M9.5 20a2.5 2.5 0 005 0" stroke="currentColor" stroke-width="1.6" fill="none"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
  };

  const w = window.open('', '_blank');
  if (!w) { alert('Please allow pop-ups to view this action in a new tab.'); return; }

  const metaRows = meta.map(m => `
    <div class="row"><span>${m.label}</span><b>${m.value}</b></div>
  `).join('');

  w.document.open();
  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="data:,">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Jost:wght@300;400;500&display=swap');
  *{box-sizing:border-box;}
  body{
    margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    font-family:'Jost',sans-serif; color:#F6F0E3; padding:24px;
    background:
      radial-gradient(90% 60% at 15% 10%, rgba(201,162,39,.28), transparent 55%),
      radial-gradient(70% 60% at 90% 90%, rgba(110,30,43,.55), transparent 55%),
      linear-gradient(165deg,#1B1030 0%, #2b1240 55%, #241030 100%);
  }
  .card{
    max-width:480px; width:100%; background:rgba(251,248,241,.06); border:1px solid rgba(201,162,39,.4);
    border-radius:160px 160px 10px 10px; padding:56px 40px 40px; text-align:center;
    box-shadow:0 30px 80px rgba(0,0,0,.4);
    animation:rise .6s cubic-bezier(.22,.7,.2,1);
  }
  @keyframes rise{from{opacity:0; transform:translateY(24px) scale(.97);} to{opacity:1; transform:translateY(0) scale(1);}}
  .ic{
    width:64px; height:64px; border-radius:50%; margin:0 auto 22px; display:flex; align-items:center; justify-content:center;
    background:${tone === 'maroon' ? 'rgba(110,30,43,.35)' : tone === 'ink' ? 'rgba(255,255,255,.1)' : 'rgba(201,162,39,.22)'};
    color:${tone === 'maroon' ? '#e7a3ab' : '#E7C766'};
    animation:pop .7s cubic-bezier(.22,.7,.2,1) .1s both;
  }
  @keyframes pop{0%{transform:scale(0);} 70%{transform:scale(1.15);} 100%{transform:scale(1);}}
  h1{font-family:'Cormorant Garamond',serif; font-size:1.9rem; margin:0 0 12px; font-weight:600;}
  p{color:rgba(247,240,224,.78); line-height:1.6; margin:0 0 24px; font-size:.95rem;}
  .rows{border-top:1px solid rgba(247,240,224,.15); margin-top:8px; padding-top:18px; text-align:left;}
  .row{display:flex; justify-content:space-between; padding:8px 0; font-size:.86rem; border-bottom:1px dashed rgba(247,240,224,.12);}
  .row span{color:rgba(247,240,224,.55);}
  .row b{color:#E7C766; font-weight:500;}
  .brand{font-family:'Cormorant Garamond',serif; letter-spacing:.04em; font-size:.8rem; color:#E7C766; text-transform:uppercase; letter-spacing:.3em; margin-top:28px; opacity:.8;}
  .close-btn{
    margin-top:26px; display:inline-block; padding:12px 26px; border:1px solid rgba(201,162,39,.6); border-radius:2px;
    color:#F6F0E3; font-size:.78rem; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; background:none;
    transition:all .3s ease;
  }
  .close-btn:hover{background:#C9A227; color:#1B1030; border-color:#C9A227;}
</style>
</head>
<body>
  <div class="card">
    <div class="ic"><svg width="28" height="28" viewBox="0 0 24 24">${icons[icon] || icons.check}</svg></div>
    <h1>${heading}</h1>
    <p>${message}</p>
    ${meta.length ? `<div class="rows">${metaRows}</div>` : ''}
    <div class="brand">Siddartha Palace</div>
    <button class="close-btn" onclick="window.close()">Close Tab</button>
  </div>
</body>
</html>`);
  w.document.close();
}

/* Convenience wrapper: read data-* attributes off a button and fire openResult */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  if (btn.tagName === 'BUTTON') e.preventDefault();

  // If inside a form requiring validation, check first
  const form = btn.closest('form');
  if (form && btn.getAttribute('data-validate') === 'true') {
    if (!validateForm(form)) return;
  }

  const meta = [];
  if (btn.dataset.meta1Label) meta.push({ label: btn.dataset.meta1Label, value: btn.dataset.meta1Value });
  if (btn.dataset.meta2Label) meta.push({ label: btn.dataset.meta2Label, value: btn.dataset.meta2Value });
  if (btn.dataset.meta3Label) meta.push({ label: btn.dataset.meta3Label, value: btn.dataset.meta3Value });
  if (btn.dataset.meta4Label) meta.push({ label: btn.dataset.meta4Label, value: btn.dataset.meta4Value });

  openResult({
    title: btn.dataset.action,
    heading: btn.dataset.heading || btn.dataset.action,
    message: btn.dataset.message || 'This action has been completed successfully.',
    meta,
    tone: btn.dataset.tone || 'gold',
    icon: btn.dataset.icon || 'check'
  });
});
