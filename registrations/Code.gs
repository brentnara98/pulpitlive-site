/**
 * Pulpit Live — trial registrations.
 *
 * Runs in YOUR Google account as an Apps Script web app. Every registration from
 * pulpitlive.app is:
 *   1. written as a row in the Google Sheet this script is attached to (the permanent list), then
 *   2. emailed to you (NOTIFY_TO), and
 *   3. confirmed to the person with their download link (so they keep it).
 *
 * Nothing here depends on a third-party form service or on email forwarding.
 *
 * Set-up (once, about 3 minutes):
 *   1. sheets.new → name the sheet "Pulpit Live registrations".
 *   2. Extensions → Apps Script. Delete what is there, paste this whole file, save (Ctrl/Cmd+S).
 *   3. Deploy → New deployment → type "Web app":
 *        Description: registrations · Execute as: Me · Who has access: Anyone
 *      → Deploy → Authorize (your own account; click Advanced → Go to … if Google warns, it is your own script)
 *      → copy the "Web app URL" (ends in /exec).
 *   4. Send that URL to Claude (or paste it into app.js as REGISTER_ENDPOINT) and the site uses it.
 *   To change this script later: edit, then Deploy → Manage deployments → pencil → Version: New → Deploy
 *   (the URL stays the same).
 */

const NOTIFY_TO = 'brentnara98@gmail.com';          // where new registrations are emailed (direct, no forwarding)
const NOTIFY_CC = 'info@pulpitlive.app';            // copy; leave '' for none
const FROM_NAME = 'Pulpit Live';
const SHEET_NAME = 'Registrations';
const SECRET = '';                                  // optional: set the same word in app.js (REGISTER_SECRET) to drop junk posts

const DOWNLOADS = {
  'win': 'https://drive.google.com/drive/folders/1zhmQKpcOEM5lN7VKjrwjEkBQWy5eKNvd?usp=sharing',
  'mac-arm': 'https://drive.google.com/drive/folders/1GKe8CMSyT6cKGhOMVzvGs-DOIxsoe08W?usp=sharing',
  'mac-intel': 'https://drive.google.com/drive/folders/18GpSUM92HI2A3fmfu-9fxm61f3QjozJM?usp=sharing',
};
const PLATFORM = { 'win': 'Windows 10 / 11', 'mac-arm': 'Mac with Apple Silicon', 'mac-intel': 'Mac with Intel' };
const HEADERS = ['When (Manila)', 'Name', 'Church', 'Address', 'Email', 'Contact number', 'Computer', 'Emailed you', 'Confirmed to them', 'Source'];

function doPost(e) {
  try {
    const body = parse_(e);
    if (SECRET && body.secret !== SECRET) return json_({ ok: false, error: 'not allowed' });
    if (body._honey) return json_({ ok: true });                        // spam trap: say yes, keep nothing
    const reg = {
      name: clean_(body.name, 80),
      church: clean_(body.church, 100),
      address: clean_(body.address, 160),
      email: clean_(body.email, 120),
      phone: clean_(body.phone, 40),
      os: PLATFORM[body.os] ? body.os : 'win',
    };
    if (!reg.name || !reg.church || !reg.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reg.email)) return json_({ ok: false, error: 'missing fields' });

    const row = sheet_();
    const when = Utilities.formatDate(new Date(), 'Asia/Manila', 'yyyy-MM-dd HH:mm');
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    let rowIndex;
    try {
      row.appendRow([when, reg.name, reg.church, reg.address, reg.email, reg.phone, PLATFORM[reg.os], '', '', 'pulpitlive.app']);
      rowIndex = row.getLastRow();
    } finally {
      lock.releaseLock();
    }

    let notified = 'no', confirmed = 'no';
    try { notifyMe_(reg, when); notified = 'yes'; } catch (err) { notified = 'failed: ' + err; }
    try { confirmThem_(reg); confirmed = 'yes'; } catch (err) { confirmed = 'failed: ' + err; }
    row.getRange(rowIndex, 8, 1, 2).setValues([[notified, confirmed]]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Opening the URL in a browser shows that the endpoint is alive (and the count so far). */
function doGet() {
  const n = Math.max(0, sheet_().getLastRow() - 1);
  return ContentService.createTextOutput('Pulpit Live registrations: up. ' + n + ' so far.').setMimeType(ContentService.MimeType.TEXT);
}

function notifyMe_(reg, when) {
  const subject = 'Pulpit Live trial — ' + reg.church + ' (' + reg.name + ')';
  const lines = [
    'New trial registration from pulpitlive.app',
    '',
    'When:     ' + when + ' (Manila)',
    'Name:     ' + reg.name,
    'Church:   ' + reg.church,
    'Address:  ' + reg.address,
    'Email:    ' + reg.email,
    'Contact:  ' + reg.phone,
    'Computer: ' + PLATFORM[reg.os],
    '',
    'Sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
  ];
  MailApp.sendEmail({ to: NOTIFY_TO, cc: NOTIFY_CC || undefined, replyTo: reg.email, name: FROM_NAME, subject: subject, body: lines.join('\n') });
}

function confirmThem_(reg) {
  const first = reg.name.split(/\s+/)[0];
  const body = [
    'Hello ' + first + ',',
    '',
    'Thank you for registering ' + reg.church + ' for the Pulpit Live trial.',
    '',
    'Your download (' + PLATFORM[reg.os] + '):',
    DOWNLOADS[reg.os],
    '',
    'The trial is the full app for 14 days. After that a lifetime license (US$99, one church, two computers) keeps it running:',
    'https://pulpitlive.app/#pricing',
    '',
    'If anything does not work — the microphone, the projector, a verse that was not caught — just reply to this email.',
    '',
    'God bless,',
    'Pulpit Live',
    'info@pulpitlive.app · https://pulpitlive.app',
  ].join('\n');
  MailApp.sendEmail({ to: reg.email, replyTo: NOTIFY_CC || NOTIFY_TO, name: FROM_NAME, subject: 'Your Pulpit Live download — ' + reg.church, body: body });
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidths(1, HEADERS.length, 160);
  }
  return sh;
}

function parse_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
  try { return JSON.parse(raw); } catch (_) { /* fall through */ }
  return (e && e.parameter) || {};
}

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor (Run ▸ testRegistration) to check the sheet and both emails. */
function testRegistration() {
  const out = doPost({ postData: { contents: JSON.stringify({ name: 'Test Pastor', church: 'Test Baptist Church', address: 'Cagayan de Oro, Philippines', email: NOTIFY_TO, phone: '+63 900 000 0000', os: 'win', secret: SECRET }) } });
  Logger.log(out.getContent());
}
