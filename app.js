document.documentElement.classList.add('js');
if (window.top !== window.self) { try { window.top.location.replace(window.self.location.href); } catch (e) { document.documentElement.hidden = true; } }
  // ---------- SETTINGS ----------
  // 1. Installer links (a GitHub Release or any file host; only shown after the trial form is sent):
  const DOWNLOADS = {
    win:        'https://drive.google.com/drive/folders/1zhmQKpcOEM5lN7VKjrwjEkBQWy5eKNvd?usp=sharing',
    'mac-arm':  'https://drive.google.com/drive/folders/1GKe8CMSyT6cKGhOMVzvGs-DOIxsoe08W?usp=sharing',
    'mac-intel':'https://drive.google.com/drive/folders/18GpSUM92HI2A3fmfu-9fxm61f3QjozJM?usp=sharing',
  };
  // 2. Where registrations go. REGISTER_ENDPOINT is your own Google Apps Script web app (see
  //    registrations/Code.gs): it writes each registration to your Google Sheet, emails you, and emails
  //    the person their download link. Until it is set, the old formsubmit.co address is used.
  const REGISTER_ENDPOINT = '';
  const REGISTER_SECRET = '';   // same word as SECRET in Code.gs, or '' for none
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/info@pulpitlive.app';
  // 3. The PayPal payment link for "Pulpit Live - Lifetime License" (US$99):
  const PAYPAL_LINK = 'https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=naraivanbrent%40gmail.com&item_name=Pulpit+Live+-+Lifetime+License+(one+church,+2+computers)&item_number=PULPITLIVE-LIFETIME&amount=99.00&currency_code=USD&no_shipping=1&no_note=0&cn=Church+name+(as+it+should+appear+on+the+license)+and+the+email+for+the+key&return=https%3A%2F%2Fpulpitlive.app%2F%23paid&cbt=Return+to+Pulpit+Live';

  document.getElementById('paypalBtn').href = PAYPAL_LINK;
  document.getElementById('lnkWin').href = DOWNLOADS.win;
  document.getElementById('lnkArm').href = DOWNLOADS['mac-arm'];
  document.getElementById('lnkIntel').href = DOWNLOADS['mac-intel'];

  // reveal on scroll
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    document.querySelectorAll('.rv').forEach((el) => io.observe(el));
  } else { document.documentElement.classList.remove('js'); }

  // hero demo: words are "heard", then the verse appears
  const demos = [
    { heard: ['turn', 'with', 'me', 'to', 'John', 'three', 'sixteen'], ref: 'John 3:16', from: 4, text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
    { heard: ['the', 'Bible', 'says', 'in', 'Romans', 'eight', 'twenty', 'eight'], ref: 'Romans 8:28', from: 4, text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' },
    { heard: ['find', 'but', 'God', 'commendeth', 'his', 'love'], ref: 'Romans 5:8', from: 0, text: 'But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.' },
    { heard: ['First', 'Corinthians', 'thirteen', 'four'], ref: '1 Corinthians 13:4', from: 0, text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,' },
  ];
  const dv = document.getElementById('demoVerse'), dr = document.getElementById('demoRef'), dh = document.getElementById('demoHeard');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let di = 1;
  function runDemo() {
    const d = demos[di % demos.length]; di++;
    dv.classList.add('hide'); dr.classList.add('hide');
    let k = 0;
    dh.textContent = 'Listening…';
    const tick = setInterval(() => {
      k++;
      dh.replaceChildren(...d.heard.slice(0, k).flatMap((w, i) => {
        const node = i >= d.from ? Object.assign(document.createElement('mark'), { textContent: w }) : document.createTextNode(w);
        return i ? [document.createTextNode(' '), node] : [node];
      }));
      if (k >= d.heard.length) {
        clearInterval(tick);
        setTimeout(() => { dv.textContent = d.text; dr.replaceChildren(document.createTextNode(d.ref), Object.assign(document.createElement('small'), { textContent: 'KJV' })); dv.classList.remove('hide'); dr.classList.remove('hide'); }, 450);
        setTimeout(runDemo, 6200);
      }
    }, 320);
  }
  if (!reduced) setTimeout(runDemo, 5000);

  // copy buttons
  function copyText(t, btn) {
    const done = () => { const old = btn.textContent; btn.textContent = 'copied'; setTimeout(() => { btn.textContent = old; }, 1200); };
    try { navigator.clipboard.writeText(t).then(done, () => { window.getSelection().selectAllChildren(btn.previousElementSibling || btn.parentElement); }); } catch (e) { window.getSelection().selectAllChildren(btn.parentElement); }
  }
  document.querySelectorAll('.copybtn[data-copy]').forEach((b) => b.addEventListener('click', () => copyText(b.dataset.copy, b)));

  // computer: pre-select from the browser — Windows, or a Mac with Apple Silicon or Intel
  const osSel = document.getElementById('os');
  const ua = navigator.userAgent;
  function macChip() {
    // Chrome and Edge say the processor type directly
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      return navigator.userAgentData.getHighEntropyValues(['architecture']).then((v) => (v.architecture === 'x86' ? 'mac-intel' : v.architecture === 'arm' ? 'mac-arm' : guessFromGraphics())).catch(guessFromGraphics);
    }
    return Promise.resolve(guessFromGraphics());
  }
  function guessFromGraphics() {
    // Safari and Firefox: the graphics chip name gives it away ("Apple M2" vs "Intel Iris")
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      const name = gl ? String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : '';
      if (/intel|amd|radeon/i.test(name)) return 'mac-intel';
    } catch (e) { /* fall through */ }
    return 'mac-arm'; // almost every Mac sold since 2020
  }
  if (/Macintosh|Mac OS X/.test(ua)) { osSel.value = 'mac-arm'; macChip().then((v) => { osSel.value = v; }); }
  else if (/Windows/.test(ua)) osSel.value = 'win';

  // trial form → form service (emails info@pulpitlive.app) → download appears
  const form = document.getElementById('trialForm'), msg = document.getElementById('formMsg'), btn = document.getElementById('trialBtn');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { msg.textContent = 'Please fill in every field.'; form.reportValidity(); return; }
    btn.disabled = true; msg.textContent = 'Registering…';
    const bot = !!form._honey.value;
    let ok = false;
    if (bot) {
      ok = true;                                   // a spam trap filled in: pretend, keep nothing
    } else if (REGISTER_ENDPOINT) {
      // your own script: a JSON body as text/plain needs no preflight, and the reply says ok:true
      const payload = { name: form.name.value, church: form.church.value, address: form.address.value, email: form.email.value, phone: form.phone.value, os: osSel.value, secret: REGISTER_SECRET };
      try {
        const r = await fetch(REGISTER_ENDPOINT, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' });
        const j = r.ok ? await r.json().catch(() => ({ ok: false })) : { ok: false };
        ok = !!j.ok;
      } catch (err) { ok = false; }
    } else if (FORM_ENDPOINT) {
      const data = new FormData(form);
      data.append('_subject', 'Pulpit Live trial registration — ' + form.church.value);
      data.append('platform', osSel.options[osSel.selectedIndex].text);
      data.append('_replyto', data.get('email'));
      data.append('_template', 'table');
      data.append('_captcha', 'false');
      try { const r = await fetch(FORM_ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } }); ok = r.ok; } catch (err) { ok = false; }
    }
    btn.disabled = false; msg.textContent = '';
    const url = DOWNLOADS[osSel.value];
    document.getElementById('dlBtn').href = url;
    const fb = document.getElementById('fallback');
    if (!ok) {
      const t = 'Pulpit Live trial registration\nName: ' + form.name.value + '\nChurch: ' + form.church.value + '\nAddress: ' + form.address.value + '\nEmail: ' + form.email.value + '\nContact: ' + form.phone.value + '\nComputer: ' + osSel.options[osSel.selectedIndex].text;
      document.getElementById('fallbackText').value = t;
      fb.hidden = false;
      document.getElementById('copyReg').onclick = (ev) => copyText(t, ev.target);
    } else { fb.hidden = true; }
    document.getElementById('dl').hidden = false;
    document.getElementById('dl').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
