// ── State ──────────────────────────────────────────────
let b64 = null, mime = 'image/jpeg', skin = null;

// ── DOM refs ────────────────────────────────────────────
const fileInput   = document.getElementById('fileInput');
const uploadZone  = document.getElementById('uploadZone');
const uploadPh    = document.getElementById('uploadPh');
const preview     = document.getElementById('preview');
const skinResult  = document.getElementById('skinResult');
const eventSelect = document.getElementById('eventSelect');
const goBtn       = document.getElementById('goBtn');
const results     = document.getElementById('results');

const platforms = [
  { n: 'ASOS',    u: q => `https://www.asos.com/search/?q=${encodeURIComponent(q)}` },
  { n: 'Amazon',  u: q => `https://www.amazon.com/s?k=${encodeURIComponent(q)}` },
  { n: 'Zalando', u: q => `https://www.zalando.com/catalog/?q=${encodeURIComponent(q)}` },
  { n: 'H&M',     u: q => `https://www2.hm.com/en_us/search-results.html?q=${encodeURIComponent(q)}` },
];

// ── Image upload ────────────────────────────────────────
fileInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  mime = f.type || 'image/jpeg';

  const reader = new FileReader();
  reader.onload = ev => {
    b64 = ev.target.result.split(',')[1];
    preview.src = ev.target.result;
    preview.style.display = 'block';
    uploadPh.style.display = 'none';
    skinResult.innerHTML = spinner('Detecting skin tone');
    detectSkin();
  };
  reader.readAsDataURL(f);
});

// ── Skin detection ──────────────────────────────────────
async function detectSkin(attempt = 0) {
  if (attempt >= 3) { useFallback(); return; }
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: b64, mimeType: mime })
    });
    const data = await res.json();
    if (!data.success || !data.skin) throw new Error(data.error || 'No skin data');
    skin = data.skin;
    renderSkin();
    checkReady();
  } catch (err) {
    setTimeout(() => detectSkin(attempt + 1), 1000);
  }
}

function useFallback() {
  // Canvas pixel fallback
  const canvas = document.createElement('canvas');
  const img = preview;
  canvas.width = img.naturalWidth || 200;
  canvas.height = img.naturalHeight || 200;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  let r = 0, g = 0, b = 0, n = 0;
  try {
    const x = Math.floor(canvas.width * .35), y = Math.floor(canvas.height * .08);
    const w = Math.floor(canvas.width * .3), h = Math.floor(canvas.height * .3);
    const d = ctx.getImageData(x, y, w, h).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 60 && d[i] > d[i+2]) { r += d[i]; g += d[i+1]; b += d[i+2]; n++; }
    }
  } catch(e) {}
  if (n > 0) { r = Math.round(r/n); g = Math.round(g/n); b = Math.round(b/n); }
  else { r = 140; g = 95; b = 65; }

  const br = Math.round((r*299 + g*587 + b*114) / 1000);
  const lp = Math.round(br / 255 * 100);
  const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');

  let fitz, label, best, avoid, ut;
  if      (lp > 70) { fitz='Type I-II';  label='Very fair';        best=['navy','burgundy','emerald','jewel tones']; avoid=['white','neon'];          ut='cool';    }
  else if (lp > 55) { fitz='Type II-III';label='Fair to light';    best=['dusty rose','sky blue','mint','lavender']; avoid=['orange','neon'];          ut='neutral'; }
  else if (lp > 40) { fitz='Type III-IV';label='Light to medium';  best=['coral','teal','olive','warm red'];          avoid=['beige','khaki'];          ut='warm';    }
  else if (lp > 25) { fitz='Type IV-V'; label='Medium to deep';    best=['ivory','gold','terracotta','rust','emerald'];avoid=['pale pastel','ash grey']; ut='warm';    }
  else              { fitz='Type V-VI';  label='Deep rich';          best=['bright white','cobalt','fuchsia','gold'];  avoid=['dark brown'];             ut='warm';    }

  skin = { fitzpatrick:fitz, undertone:ut, label, hex, lightnessPct:lp, confidence:55,
           bestColors:best, avoidColors:avoid, metallic: lp<45 ? 'gold' : 'silver',
           tip:'Matched via pixel analysis — try clearer photo for better results' };
  renderSkin();
  checkReady();
}

function renderSkin() {
  const s = skin;
  skinResult.innerHTML = `
    <div class="skin-panel">
      <div class="swatch-row">
        <div class="swatch" style="background:${s.hex}"></div>
        <div>
          <div class="skin-name">${s.label}</div>
          <div class="skin-sub">${s.fitzpatrick} · ${s.undertone} undertone · best metal: ${s.metallic}</div>
        </div>
      </div>
      <div class="tone-bar"><div class="tone-fill" style="width:${s.lightnessPct}%;background:${s.hex}"></div></div>
      <div class="conf-row">
        <span>Detection confidence: <strong>${s.confidence}%</strong></span>
        <span class="${s.confidence >= 65 ? 'conf-good' : 'conf-low'}">${s.confidence >= 65 ? '✓ Good accuracy' : '⚠ Pixel fallback'}</span>
      </div>
      <div class="chips-label">Colors that suit you</div>
      <div class="chips">${s.bestColors.map(c => `<span class="chip-good">✓ ${c}</span>`).join('')}</div>
      <div class="chips-label">Colors to avoid</div>
      <div class="chips">${s.avoidColors.map(c => `<span class="chip-bad">✕ ${c}</span>`).join('')}</div>
      <div class="tip-row">💡 ${s.tip}</div>
    </div>`;
}

// ── Readiness check ─────────────────────────────────────
eventSelect.addEventListener('change', checkReady);
function checkReady() {
  goBtn.disabled = !(b64 && skin && eventSelect.value);
}

// ── Outfit generation ───────────────────────────────────
goBtn.addEventListener('click', getOutfits);

async function getOutfits() {
  const eventName = eventSelect.value;
  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'none';
  goBtn.style.display = 'none';
  results.classList.remove('hidden');
  results.innerHTML = spinner('Building your outfits');

  let outfits = null;
  for (let att = 0; att < 3; att++) {
    try {
      const res = await fetch('/api/outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skin, eventName })
      });
      const data = await res.json();
      if (!data.success || !Array.isArray(data.outfits)) throw new Error(data.error || 'No outfits');
      outfits = data.outfits;
      break;
    } catch (err) {
      if (att === 2) {
        results.innerHTML = `
          <div class="error-box">Could not generate outfits. Check your API key and try again.</div>
          <button class="reset-btn" onclick="resetApp()">← Go back</button>`;
        return;
      }
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  const s = skin;
  results.innerHTML = `
    <div class="results-header">
      <div class="skin-summary">
        <div class="skin-dot" style="background:${s.hex}"></div>
        <div class="skin-summary-text">
          <strong>${s.label}</strong> · ${s.fitzpatrick} · ${s.undertone} undertone
        </div>
      </div>
      <h2>Outfits for ${eventName}</h2>
    </div>
    ${outfits.map(o => `
      <div class="outfit-card">
        <div class="outfit-head">
          <div class="outfit-title">${o.title || 'Look'}</div>
          <span class="vibe-tag">${o.vibe || 'Style'}</span>
        </div>
        <div class="outfit-desc">${o.description || ''}</div>
        ${(o.items || []).map(item => `
          <div class="item-row">
            <div class="item-name">${item.name || item}</div>
            <div class="shop-links">
              ${platforms.map(p => `<a class="shop-link" href="${p.u(item.searchQuery || item.name || '')}" target="_blank" rel="noopener">${p.n}</a>`).join('')}
            </div>
          </div>`).join('')}
      </div>`).join('')}
    <button class="reset-btn" onclick="resetApp()">← Try another look</button>`;
}

// ── Reset ───────────────────────────────────────────────
function resetApp() {
  b64 = null; skin = null; mime = 'image/jpeg';
  ['step1','step2'].forEach(id => document.getElementById(id).style.display = 'block');
  goBtn.style.display = 'block';
  results.classList.add('hidden');
  results.innerHTML = '';
  preview.style.display = 'none';
  uploadPh.style.display = 'block';
  skinResult.innerHTML = '';
  eventSelect.value = '';
  fileInput.value = '';
  goBtn.disabled = true;
}

// ── Helpers ─────────────────────────────────────────────
function spinner(msg) {
  return `<div class="spinner">${msg}<span style="display:inline-block;animation:d 1.2s infinite">.</span></div>
  <style>@keyframes d{0%{content:'.'}33%{content:'..'}66%{content:'...'}}</style>`;
}
