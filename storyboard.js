const storyImageEl = document.querySelector('#storyImage');
const storyPreview = document.querySelector('#storySourcePreview');
const storyDrop = document.querySelector('#storyDrop');
const keyEl = document.querySelector('#geminiKey');
const openRouterKeyEl = document.querySelector('#openRouterKey');
const generateBtn = document.querySelector('#generateStoryboard');
const copyMasterBtn = document.querySelector('#copyMasterPrompt');
const downloadBtn = document.querySelector('#downloadStoryboard');
const storyStatus = document.querySelector('#storyStatus');
const sheet = document.querySelector('#storyboardSheet');

let sourceDataUrl = '';
let storyboard = null;
let storyTimerId = null;
let storyStartedAt = 0;
let storyProgressScene = 0;

const saveKeyBtn = document.querySelector('#saveGeminiKey');
const keySaveStatus = document.querySelector('#keySaveStatus');
const saveOpenRouterKeyBtn = document.querySelector('#saveOpenRouterKey');
const openRouterKeySaveStatus = document.querySelector('#openRouterKeySaveStatus');
const generateImagesBtnEl = document.querySelector('#generateSceneImages');

function lockGeminiKey(){
  if(keyEl){ keyEl.readOnly = true; keyEl.disabled = true; }
  if(saveKeyBtn){
    saveKeyBtn.disabled = true;
    saveKeyBtn.textContent = 'API Key Tersimpan ✓';
  }
}

function lockOpenRouterKey(){
  if(openRouterKeyEl){ openRouterKeyEl.readOnly = true; openRouterKeyEl.disabled = true; }
  if(saveOpenRouterKeyBtn){
    saveOpenRouterKeyBtn.disabled = true;
    saveOpenRouterKeyBtn.textContent = 'OpenRouter Tersimpan ✓';
  }
}
function unlockOpenRouterKey(){
  if(openRouterKeyEl){ openRouterKeyEl.readOnly = false; openRouterKeyEl.disabled = false; }
  if(saveOpenRouterKeyBtn){
    saveOpenRouterKeyBtn.disabled = false;
    saveOpenRouterKeyBtn.textContent = 'Simpan OpenRouter';
  }
}
function loadOpenRouterKey(){
  try{
    const saved = localStorage.getItem('iwan_openrouter_api_key') || '';
    openRouterKeyEl.value = saved;
    if(saved){
      if(openRouterKeySaveStatus) openRouterKeySaveStatus.textContent = 'OpenRouter API key tersimpan di browser.';
      lockOpenRouterKey();
    }else{
      unlockOpenRouterKey();
    }
  }catch(err){
    console.warn('localStorage OpenRouter tidak tersedia', err);
    unlockOpenRouterKey();
  }
}
function saveOpenRouterKey(event){
  event?.preventDefault();
  event?.stopPropagation();
  const key = openRouterKeyEl.value.trim();
  if(!key){
    if(openRouterKeySaveStatus) openRouterKeySaveStatus.textContent = 'OpenRouter API key masih kosong.';
    return;
  }
  try{
    localStorage.setItem('iwan_openrouter_api_key', key);
    if(localStorage.getItem('iwan_openrouter_api_key') !== key) throw new Error('Verifikasi penyimpanan gagal.');
    if(openRouterKeySaveStatus) openRouterKeySaveStatus.textContent = '✓ OpenRouter API key tersimpan di browser.';
    lockOpenRouterKey();
  }catch(err){
    console.error(err);
    if(openRouterKeySaveStatus) openRouterKeySaveStatus.textContent = '✕ Gagal menyimpan OpenRouter API key.';
  }
}

function unlockGeminiKey(){
  if(keyEl){ keyEl.readOnly = false; keyEl.disabled = false; }
  if(saveKeyBtn){
    saveKeyBtn.disabled = false;
    saveKeyBtn.textContent = 'Simpan API Key';
  }
}

function loadGeminiKey(){
  try{
    const saved = localStorage.getItem('iwan_gemini_api_key') || '';
    keyEl.value = saved;
    if(saved){
      if(keySaveStatus) keySaveStatus.textContent = 'API key tersimpan di browser.';
      lockGeminiKey();
    }else{
      unlockGeminiKey();
    }
  }catch(err){
    console.warn('localStorage tidak tersedia', err);
    if(keySaveStatus) keySaveStatus.textContent = 'Penyimpanan browser tidak tersedia.';
    unlockGeminiKey();
  }
}

function saveGeminiKey(event){
  event?.preventDefault();
  event?.stopPropagation();
  const key = keyEl.value.trim();
  if(!key){
    if(keySaveStatus) keySaveStatus.textContent = 'API key masih kosong.';
    setStoryStatus('Masukkan API key Gemini terlebih dahulu.');
    keyEl.focus();
    return;
  }
  try{
    localStorage.setItem('iwan_gemini_api_key', key);
    const check = localStorage.getItem('iwan_gemini_api_key');
    if(check !== key) throw new Error('Verifikasi penyimpanan gagal.');
    if(keySaveStatus) keySaveStatus.textContent = '✓ API key tersimpan di browser.';
    setStoryStatus('API key Gemini berhasil disimpan dan dikunci.');
    lockGeminiKey();
  }catch(err){
    console.error(err);
    if(keySaveStatus) keySaveStatus.textContent = '✕ Gagal menyimpan di browser.';
    setStoryStatus('Gagal menyimpan API key. Browser memblokir penyimpanan lokal.');
  }
}

loadGeminiKey();
loadOpenRouterKey();
saveKeyBtn?.addEventListener('click', saveGeminiKey);
saveOpenRouterKeyBtn?.addEventListener('click', saveOpenRouterKey);

keyEl.addEventListener('change', saveGeminiKey);

function formatElapsed(ms){ const s=Math.floor(ms/1000); const m=Math.floor(s/60); return String(m).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
function startStoryTimer(){ clearInterval(storyTimerId); storyStartedAt=Date.now(); storyProgressScene=0; storyTimerId=setInterval(()=>updateProgress(storyProgressScene),250); updateProgress(0); }
function stopStoryTimer(){ clearInterval(storyTimerId); storyTimerId=null; }
function updateProgress(sceneCurrent=storyProgressScene, phase=''){ const elapsed=storyStartedAt?formatElapsed(Date.now()-storyStartedAt):'00:00'; const total=6; storyProgressScene=Math.max(0,Math.min(total,sceneCurrent)); const phaseText=phase?` · ${phase}`:''; storyStatus.textContent=`Waktu ${elapsed} · Scene ${storyProgressScene}/${total}${phaseText}`; }

function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}

async function setSource(file){
  if(!file || !file.type.startsWith('image/')) return;
  sourceDataUrl=await fileToDataUrl(file);
  storyPreview.src=sourceDataUrl;
  storyPreview.hidden=false;
  setStoryStatus('Screenshot siap dibaca AI.');
}

storyImageEl.addEventListener('change', e=>setSource(e.target.files?.[0]));
storyDrop.addEventListener('dragover',e=>e.preventDefault());
storyDrop.addEventListener('drop',async e=>{
  e.preventDefault();
  await setSource(e.dataTransfer.files?.[0]);
});

function extractJson(text){
  const cleaned=text.replace(/\`\`\`json/gi,'').replace(/\`\`\`/g,'').trim();
  const start=cleaned.indexOf('{'), end=cleaned.lastIndexOf('}');
  if(start<0 || end<0) throw new Error('Respons AI tidak berisi JSON storyboard.');
  return JSON.parse(cleaned.slice(start,end+1));
}

function promptForGemini(){
  return `Analisis gambar produk yang saya kirim sebagai sumber informasi produk dan referensi identitas visual. Buat storyboard iklan video 6 scene yang siap dipakai pada AI video generator.

ATURAN WAJIB:
- Tepat 6 scene, berurutan Scene 1 sampai Scene 6.
- Target video FINAL selalu native vertical 9:16 untuk smartphone.
- Pertahankan identitas, bentuk, warna, logo, material, konektor, tombol, dan detail produk dari sumber. Jangan mengarang perubahan desain produk.
- Screenshot adalah SUMBER INFORMASI, BUKAN FRAME VIDEO YANG HARUS DISALIN.
- ABAIKAN dan JANGAN masukkan ke visual scene: status bar HP (jam, sinyal, Wi-Fi, baterai), marketplace/app chrome, menu, ikon navigasi, notifikasi, commission/komisi, tombol belanja, rating, alamat, dan teks kecil yang tidak relevan dengan produk.
- Jika harga produk terlihat dan relevan untuk iklan, harga boleh disebut sebagai informasi/overlay dalam prompt, tetapi jangan menyalin seluruh tampilan marketplace.
- Visual scene harus berupa adegan produk yang bersih, sinematik, realistis, dan fokus pada produk serta konteks pemakaiannya.
- Setiap scene memiliki: durasi, visual, gerakan, dan prompt.
- Prompt setiap scene harus spesifik tentang subjek, komposisi, kamera, gerakan kamera/objek, pencahayaan, kontinuitas produk, dan output vertical 9:16.
- Buat gerakan yang realistis dan mudah dipahami AI video generator.
- Hindari watermark, UI marketplace, status bar, teks acak, produk berubah bentuk, tangan/jari ekstra, dan objek yang tidak relevan.
- Scene harus membentuk satu alur iklan yang logis dari pembuka sampai hero/CTA.
- Master prompt harus merangkum kesinambungan seluruh 6 scene dan tetap mengunci native 9:16.
- Jangan memasukkan markdown di dalam JSON.

Keluarkan HANYA JSON dengan struktur:
{
  "title": "judul storyboard",
  "scenes": [
    {
      "scene": 1,
      "duration": "0-3 detik",
      "visual": "deskripsi visual bersih tanpa UI screenshot",
      "motion": "arahan gerakan kamera dan/atau objek",
      "prompt": "prompt siap copy untuk AI video generator, wajib menyebut clean visual dan no UI"
    }
  ],
  "master_prompt": "prompt induk siap copy, wajib menyebut clean visual, no marketplace UI, no phone status bar, native vertical 9:16"
}`;
}

async function geminiTextStoryboard(key){
  const base64=sourceDataUrl.split(',')[1];
  const mime=sourceDataUrl.slice(5,sourceDataUrl.indexOf(';'));
  const models=['gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash'];
  let lastError='Gemini tidak dapat memproses storyboard.';
  for(const model of models){
    for(let attempt=0;attempt<2;attempt++){
      try{
        const body={
          model,
          input:[
            {type:'image',mime_type:mime,data:base64},
            {type:'text',text:promptForGemini()}
          ],
          response_format:{type:'text',mime_type:'application/json'}
        };
        const controller=new AbortController();
        const timeoutId=setTimeout(()=>controller.abort(),45000);
        let res;
        try{
          res=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions?key='+encodeURIComponent(key),{
            method:'POST',
            headers:{'Content-Type':'application/json','x-goog-api-key':key},
            body:JSON.stringify(body),
            signal:controller.signal
          });
        }finally{ clearTimeout(timeoutId); }
        const data=await res.json();
        if(res.ok){
          const text=data?.steps?.filter(s=>s.type==='model_output')?.flatMap(s=>s.content||[]).filter(p=>p.type==='text').map(p=>p.text||'').join('') || '';
          if(!text) throw new Error('Gemini tidak mengembalikan teks storyboard.');
          return extractJson(text);
        }
        lastError=data?.error?.message || ('Gemini gagal pada '+model+'.');
        if(!(res.status===429 || res.status>=500)) throw new Error(lastError);
      }catch(err){
        lastError=err?.name==='AbortError' ? 'Gemini timeout setelah 45 detik.' : (err?.message || String(err));
      }
      if(attempt===0) await new Promise(r=>setTimeout(r,1200));
    }
  }
  throw new Error(lastError);
}

async function generateCleanSceneImage(openRouterKey, scene){
  const model='qwen/qwen-image-3';
  const cleanPrompt=`Create ONE clean advertising storyboard frame for Scene ${scene.scene}.

The supplied image is ONLY a product reference. Recreate the physical product as a clean standalone commercial visual.

SCENE VISUAL:
${scene.visual}

SCENE MOTION CONTEXT:
${scene.motion}

STRICT RULES:
- Do NOT reproduce, trace, crop, screenshot, or preserve the marketplace page.
- Do NOT show marketplace UI, shopping UI, app chrome, status bar, menus, buttons, ratings, price panels, commission/affiliate information, seller information, navigation icons, comments, badges, or irrelevant text.
- Do NOT place the supplied screenshot inside the generated image.
- Preserve the recognizable product shape, colors, materials, branding, connector details and physical features.
- No invented redesign.
- No watermark and no random text.
- Clean cinematic advertising composition with realistic lighting and materials.
- Product is the main subject.
- Native vertical 9:16 composition for smartphone video.
- Generate an image, not a screenshot.`;

  const controller=new AbortController();
  const timeoutId=setTimeout(()=>controller.abort(),75000);
  try{
    const body={
      model,
      prompt:cleanPrompt,
      input_references:[
        {type:'image_url',image_url:{url:sourceDataUrl}}
      ],
      aspect_ratio:'9:16',
      resolution:'1K'
    };
    const res=await fetch('https://openrouter.ai/api/v1/images',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+openRouterKey
      },
      body:JSON.stringify(body),
      signal:controller.signal
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data?.error?.message || 'OpenRouter image generation gagal pada Scene '+scene.scene+'.');
    const item=data?.data?.[0];
    if(!item?.b64_json) throw new Error('OpenRouter tidak mengembalikan gambar untuk Scene '+scene.scene+'.');
    const mediaType=item.media_type || 'image/png';
    return 'data:'+mediaType+';base64,'+item.b64_json;
  }catch(err){
    if(err?.name==='AbortError') throw new Error('OpenRouter timeout setelah 75 detik pada Scene '+scene.scene+'.');
    throw err;
  }finally{
    clearTimeout(timeoutId);
  }
}

async function generateStoryboard(){
  if(!sourceDataUrl){setStoryStatus('Upload screenshot terlebih dahulu.');return;}
  const key=keyEl.value.trim();
  if(!key){
    setStoryStatus('Masukkan Gemini API key terlebih dahulu.');
    keyEl.focus();
    return;
  }
  localStorage.setItem('iwan_gemini_api_key',key);
  const generateImagesBtn=generateImagesBtnEl;
  generateBtn.disabled=true;
  startStoryTimer();
  updateProgress(0,'membaca screenshot & menyusun storyboard');
  try{
    storyboard=await geminiTextStoryboard(key);
    storyboard.scenes=Array.isArray(storyboard.scenes)?storyboard.scenes.slice(0,6):[];
    if(storyboard.scenes.length!==6) throw new Error('Gemini tidak menghasilkan tepat 6 scene.');

    storyboard.scenes=storyboard.scenes.map(s=>({...s, imageDataUrl:''}));
    renderStoryboard();

    if(generateImagesBtn){
      generateImagesBtn.disabled=false;
      generateImagesBtn.textContent='Generate 6 Gambar';
    }
    const textElapsed=formatElapsed(Date.now()-storyStartedAt);
    stopStoryTimer();
    setStoryStatus(`Storyboard teks selesai ${textElapsed} · Scene 6/6 · tombol Generate 6 Gambar siap.`);
  }catch(err){
    console.error(err);
    stopStoryTimer();
    setStoryStatus(`Gagal setelah ${formatElapsed(Date.now()-storyStartedAt)} · ${err.message||err}`);
  }finally{
    generateBtn.disabled=false;
  }
}

async function generateAllSceneImages(){
  if(!storyboard?.scenes?.length){ setStoryStatus('Buat storyboard teks terlebih dahulu.'); return; }
  const openRouterKey=openRouterKeyEl.value.trim();
  if(!openRouterKey){ setStoryStatus('Masukkan OpenRouter API key terlebih dahulu.'); openRouterKeyEl.focus(); return; }
  const btn=document.querySelector('#generateSceneImages');
  if(btn) btn.disabled=true;
  startStoryTimer();
  const started=Date.now();
  for(let i=0;i<storyboard.scenes.length;i++){
    updateProgress(i,'generate gambar bersih');
    try{
      storyboard.scenes[i].imageDataUrl=await generateCleanSceneImage(openRouterKey,storyboard.scenes[i]);
      storyboard.scenes[i].imageFallback=false;
    }catch(err){
      storyboard.scenes[i].imageDataUrl='';
      storyboard.scenes[i].imageFallback=true;
      storyboard.scenes[i].imageError=err?.message || 'Image generation gagal.';
    }
    renderStoryboard();
    updateProgress(i+1,'gambar selesai');
  }
  stopStoryTimer();
  const failed=storyboard.scenes.filter(s=>!s.imageDataUrl).length;
  setStoryStatus(failed
    ? `Generate gambar selesai ${formatElapsed(Date.now()-started)} · ${failed} scene belum memiliki gambar.`
    : `Generate 6 gambar selesai ${formatElapsed(Date.now()-started)} · Scene 6/6 ✓`);
  if(btn){ btn.disabled=false; btn.textContent='Generate 6 Gambar'; }
}

function escapeHtml(v=''){
  return String(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
}

function renderStoryboard(){
  const scenes=Array.isArray(storyboard?.scenes)?storyboard.scenes.slice(0,6):[];
  const cards=scenes.map(s=>{
    const img=s.imageDataUrl;
    return `
    <article class="scene-card">
      <div class="scene-top"><span>SCENE ${escapeHtml(s.scene)}</span><span>${escapeHtml(s.duration)}</span></div>
      ${img ? `<img class="scene-image" src="${img}" alt="Visual bersih scene">` : `<div class="scene-image scene-image-missing">Visual scene belum berhasil dibuat.<br><small>Screenshot marketplace tidak digunakan sebagai fallback.</small></div>`}
      <div class="scene-label">Visual</div>
      <div class="scene-desc">${escapeHtml(s.visual)}</div>
      <div class="scene-label">Gerakan</div>
      <div class="scene-desc">${escapeHtml(s.motion)}</div>
      <div class="scene-label">Prompt Scene</div>
      <div class="scene-prompt">${escapeHtml(s.prompt)}</div>
    </article>`;
  }).join('');
  sheet.innerHTML=`
    <div class="story-title">${escapeHtml(storyboard?.title || 'Storyboard 6 Scene')}</div>
    <div class="story-format">MASTER FORMAT: NATIVE VERTICAL 9:16 · CLEAN PRODUCT VISUAL · Smartphone Video</div>
    <div class="story-scenes">${cards}</div>
    <div class="master-box"><h3>MASTER PROMPT — COPY</h3><p>${escapeHtml(storyboard?.master_prompt || '')}</p></div>`;
}

copyMasterBtn.addEventListener('click',async()=>{
  if(!storyboard?.master_prompt){setStoryStatus('Buat storyboard terlebih dahulu.');return;}
  await navigator.clipboard.writeText(storyboard.master_prompt);
  setStoryStatus('Master Prompt sudah di-copy.');
});

function downloadStoryboard(){
  if(!storyboard){setStoryStatus('Buat storyboard terlebih dahulu.');return;}
  const html='<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeHtml(storyboard.title||'Storyboard 6 Scene')+'</title><style>body{font-family:Arial,sans-serif;background:#eee;margin:0;padding:20px;color:#111}.sheet{max-width:1100px;margin:auto;background:#fff;padding:20px}.scenes{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.card{border:1px solid #ccc;border-radius:10px;padding:10px;break-inside:avoid}.card img{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:7px;background:#f4f4f4}.top{display:flex;justify-content:space-between;font-weight:bold;font-size:12px}.label{font-size:10px;font-weight:bold;color:#666;text-transform:uppercase;margin-top:7px}.desc{font-size:11px;line-height:1.4}.prompt{font:10px/1.4 monospace;background:#f1f1f1;padding:7px;border-radius:6px;white-space:pre-wrap}.master{margin-top:12px;border:1px solid #ccc;padding:10px;border-radius:10px}.master p{font:10px/1.4 monospace;white-space:pre-wrap}@media(max-width:700px){.scenes{grid-template-columns:1fr}}@media print{body{background:#fff;padding:0}.sheet{max-width:none}}</style></head><body><main class="sheet"><h1>'+escapeHtml(storyboard.title||'Storyboard 6 Scene')+'</h1><p>NATIVE VERTICAL 9:16 · CLEAN PRODUCT VISUAL</p><section class="scenes">'+storyboard.scenes.slice(0,6).map(s=>'<article class="card"><div class="top"><span>SCENE '+escapeHtml(s.scene)+'</span><span>'+escapeHtml(s.duration)+'</span></div>'+(s.imageDataUrl ? '<img src="'+s.imageDataUrl+'" alt="Visual bersih">' : '<div style="padding:30px;border:1px dashed #aaa">Visual scene belum berhasil dibuat.</div>')+'<div class="label">Visual</div><div class="desc">'+escapeHtml(s.visual)+'</div><div class="label">Gerakan</div><div class="desc">'+escapeHtml(s.motion)+'</div><div class="label">Prompt Scene</div><div class="prompt">'+escapeHtml(s.prompt)+'</div></article>').join('')+'</section><section class="master"><h3>MASTER PROMPT</h3><p>'+escapeHtml(storyboard.master_prompt||'')+'</p></section></main></body></html>';
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='iwan-storyboard-6-scene.html';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  setStoryStatus('Storyboard sudah di-download. Bisa dibuka atau Print → Save as PDF.');
}

generateBtn.addEventListener('click',generateStoryboard);
generateImagesBtnEl?.addEventListener('click',generateAllSceneImages);
downloadBtn.addEventListener('click',downloadStoryboard);
