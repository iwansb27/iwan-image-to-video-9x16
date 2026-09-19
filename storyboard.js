const storyImageEl = document.querySelector('#storyImage');
const storyPreview = document.querySelector('#storySourcePreview');
const storyDrop = document.querySelector('#storyDrop');
const keyEl = document.querySelector('#geminiKey');
const generateBtn = document.querySelector('#generateStoryboard');
const copyMasterBtn = document.querySelector('#copyMasterPrompt');
const downloadBtn = document.querySelector('#downloadStoryboard');
const storyStatus = document.querySelector('#storyStatus');
const sheet = document.querySelector('#storyboardSheet');

let sourceDataUrl = '';
let storyboard = null;

const saveKeyBtn = document.querySelector('#saveGeminiKey');
const keySaveStatus = document.querySelector('#keySaveStatus');

function lockGeminiKey(){
  if(keyEl){ keyEl.readOnly = true; keyEl.disabled = true; }
  if(saveKeyBtn){
    saveKeyBtn.disabled = true;
    saveKeyBtn.textContent = 'API Key Tersimpan ✓';
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
saveKeyBtn?.addEventListener('click', saveGeminiKey);

keyEl.addEventListener('change', saveGeminiKey);

function setStoryStatus(t){ storyStatus.textContent = t; }

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
  const models=['gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash','gemini-3.5-flash-lite'];
  let lastError='Gemini tidak dapat memproses permintaan.';
  for(const model of models){
    const body={
      model,
      input:[
        {type:'image',mime_type:mime,data:base64},
        {type:'text',text:promptForGemini()}
      ],
      response_format:{type:'text',mime_type:'application/json'}
    };
    for(let attempt=0;attempt<3;attempt++){
      try{
        const res=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions?key='+encodeURIComponent(key),{
          method:'POST',
          headers:{'Content-Type':'application/json','x-goog-api-key':key},
          body:JSON.stringify(body)
        });
        const data=await res.json();
        if(res.ok){
          const text=data?.steps?.filter(s=>s.type==='model_output')?.flatMap(s=>s.content||[]).filter(p=>p.type==='text').map(p=>p.text||'').join('') || '';
          if(!text) throw new Error('Gemini tidak mengembalikan teks storyboard.');
          return extractJson(text);
        }
        lastError=data?.error?.message || ('Gemini API gagal pada '+model+'.');
        const transient=res.status===429 || res.status===500 || res.status===502 || res.status===503 || res.status===504;
        if(!transient) throw new Error(lastError);
      }catch(err){
        lastError=err?.message || String(err);
        if(attempt===2 && !/high demand|temporar|429|503|502|504/i.test(lastError)) throw err;
      }
      await new Promise(r=>setTimeout(r,1200*Math.pow(2,attempt)));
    }
  }
  throw new Error(lastError+' Semua model Flash yang tersedia sedang sibuk. Silakan coba lagi beberapa saat.');
}

async function generateCleanSceneImage(key, scene){
  const base64=sourceDataUrl.split(',')[1];
  const mime=sourceDataUrl.slice(5,sourceDataUrl.indexOf(';'));
  const cleanPrompt=`Create ONE clean advertising storyboard frame for Scene ${scene.scene}.

Use the supplied product screenshot ONLY as product-reference information. Preserve the exact recognizable product identity, shape, colors, materials, branding, connector details and important physical features.

SCENE VISUAL:
${scene.visual}

SCENE MOTION CONTEXT:
${scene.motion}

CLEAN-UP RULES:
- Do NOT reproduce the marketplace screenshot layout.
- Remove/ignore phone status bar: time, signal, Wi-Fi, battery.
- Remove/ignore marketplace/app UI, menus, buttons, commission/affiliate information, ratings, navigation icons and irrelevant tiny text.
- Do not show the original screenshot as a screenshot or phone screen unless the scene explicitly requires a phone as a physical prop.
- Focus on the real product in a clean cinematic environment.
- No watermark.
- No random text.
- No invented product redesign.
- Keep the product prominent and physically plausible.
- Composition must be native vertical 9:16, optimized for smartphone video.
- This is a visual storyboard reference frame, not a finished video.`;

  const body={
    contents:[{
      parts:[
        {text:cleanPrompt},
        {inline_data:{mime_type:mime,data:base64}}
      ]
    }],
    generationConfig:{
      responseModalities:['IMAGE'],
      responseFormat:{image:{aspectRatio:'9:16'}}
    }
  };
  const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key='+encodeURIComponent(key),{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  const data=await res.json();
  if(!res.ok) throw new Error(data?.error?.message || 'Gemini image generation gagal pada Scene '+scene.scene+'.');
  const part=data?.candidates?.[0]?.content?.parts?.find(p=>p.inlineData?.data || p.inline_data?.data);
  const imageData=part?.inlineData?.data || part?.inline_data?.data;
  const imageMime=part?.inlineData?.mimeType || part?.inlineData?.mime_type || part?.inline_data?.mimeType || part?.inline_data?.mime_type || 'image/png';
  if(!imageData) throw new Error('Gemini tidak mengembalikan gambar untuk Scene '+scene.scene+'.');
  return 'data:'+imageMime+';base64,'+imageData;
}

async function generateStoryboard(){
  if(!sourceDataUrl){setStoryStatus('Upload screenshot terlebih dahulu.');return;}
  const key=keyEl.value.trim();
  if(!key){
    setStoryStatus('Masukkan Gemini API key terlebih dahulu. Key hanya disimpan lokal di browser.');
    keyEl.focus();
    return;
  }
  localStorage.setItem('iwan_gemini_api_key',key);
  generateBtn.disabled=true;
  setStoryStatus('Gemini sedang membaca screenshot dan menyusun 6 scene…');
  try{
    storyboard=await geminiTextStoryboard(key);
    storyboard.scenes=Array.isArray(storyboard.scenes)?storyboard.scenes.slice(0,6):[];
    if(storyboard.scenes.length!==6) throw new Error('Gemini tidak menghasilkan tepat 6 scene.');

    storyboard.scenes=storyboard.scenes.map(s=>({...s, imageDataUrl:''}));
    renderStoryboard();

    for(let i=0;i<storyboard.scenes.length;i++){
      setStoryStatus('Membuat visual bersih Scene '+(i+1)+' dari 6…');
      try{
        storyboard.scenes[i].imageDataUrl=await generateCleanSceneImage(key,storyboard.scenes[i]);
      }catch(imageErr){
        console.warn(imageErr);
        storyboard.scenes[i].imageDataUrl='';
        storyboard.scenes[i].imageFallback=true;
        storyboard.scenes[i].imageError=imageErr?.message || 'Image generation gagal.';
      }
      renderStoryboard();
    }

    const fallbackCount=storyboard.scenes.filter(s=>s.imageFallback).length;
    setStoryStatus(fallbackCount
      ? 'Storyboard selesai, tetapi '+fallbackCount+' visual belum dibuat. Screenshot marketplace TIDAK dipakai sebagai fallback agar hasil tetap bersih.'
      : 'Storyboard 6 scene selesai dengan visual bersih 9:16.');
  }catch(err){
    console.error(err);
    setStoryStatus('Gagal membuat storyboard: '+(err.message||err));
  }finally{
    generateBtn.disabled=false;
  }
}

function escapeHtml(v=''){
  return String(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
}

function renderStoryboard(){
  const scenes=Array.isArray(storyboard?.scenes)?storyboard.scenes.slice(0,6):[];
  const cards=scenes.map(s=>{
    const img=s.imageDataUrl || sourceDataUrl;
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
  const html='<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeHtml(storyboard.title||'Storyboard 6 Scene')+'</title><style>body{font-family:Arial,sans-serif;background:#eee;margin:0;padding:20px;color:#111}.sheet{max-width:1100px;margin:auto;background:#fff;padding:20px}.scenes{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.card{border:1px solid #ccc;border-radius:10px;padding:10px;break-inside:avoid}.card img{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:7px;background:#f4f4f4}.top{display:flex;justify-content:space-between;font-weight:bold;font-size:12px}.label{font-size:10px;font-weight:bold;color:#666;text-transform:uppercase;margin-top:7px}.desc{font-size:11px;line-height:1.4}.prompt{font:10px/1.4 monospace;background:#f1f1f1;padding:7px;border-radius:6px;white-space:pre-wrap}.master{margin-top:12px;border:1px solid #ccc;padding:10px;border-radius:10px}.master p{font:10px/1.4 monospace;white-space:pre-wrap}@media(max-width:700px){.scenes{grid-template-columns:1fr}}@media print{body{background:#fff;padding:0}.sheet{max-width:none}}</style></head><body><main class="sheet"><h1>'+escapeHtml(storyboard.title||'Storyboard 6 Scene')+'</h1><p>NATIVE VERTICAL 9:16 · CLEAN PRODUCT VISUAL</p><section class="scenes">'+storyboard.scenes.slice(0,6).map(s=>'<article class="card"><div class="top"><span>SCENE '+escapeHtml(s.scene)+'</span><span>'+escapeHtml(s.duration)+'</span></div><img src="'+(s.imageDataUrl||sourceDataUrl)+'" alt="Visual bersih"><div class="label">Visual</div><div class="desc">'+escapeHtml(s.visual)+'</div><div class="label">Gerakan</div><div class="desc">'+escapeHtml(s.motion)+'</div><div class="label">Prompt Scene</div><div class="prompt">'+escapeHtml(s.prompt)+'</div></article>').join('')+'</section><section class="master"><h3>MASTER PROMPT</h3><p>'+escapeHtml(storyboard.master_prompt||'')+'</p></section></main></body></html>';
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='iwan-storyboard-6-scene.html';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  setStoryStatus('Storyboard sudah di-download. Bisa dibuka atau Print → Save as PDF.');
}

generateBtn.addEventListener('click',generateStoryboard);
downloadBtn.addEventListener('click',downloadStoryboard);
