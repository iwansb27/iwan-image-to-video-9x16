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

const savedKey = localStorage.getItem('iwan_gemini_api_key') || '';
keyEl.value = savedKey;
keyEl.addEventListener('change', () => {
  localStorage.setItem('iwan_gemini_api_key', keyEl.value.trim());
});

function setStoryStatus(t){ storyStatus.textContent = t; }

function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}

storyImageEl.addEventListener('change', async e=>{
  const file=e.target.files?.[0];
  if(!file)return;
  sourceDataUrl=await fileToDataUrl(file);
  storyPreview.src=sourceDataUrl;
  storyPreview.hidden=false;
  setStoryStatus('Screenshot siap dibaca AI.');
});

storyDrop.addEventListener('dragover',e=>e.preventDefault());
storyDrop.addEventListener('drop',async e=>{
  e.preventDefault();
  const file=e.dataTransfer.files?.[0];
  if(!file || !file.type.startsWith('image/'))return;
  sourceDataUrl=await fileToDataUrl(file);
  storyPreview.src=sourceDataUrl;
  storyPreview.hidden=false;
  setStoryStatus('Screenshot siap dibaca AI.');
});

function extractJson(text){
  const cleaned=text.replace(/\`\`\`json/gi,'').replace(/\`\`\`/g,'').trim();
  const start=cleaned.indexOf('{'), end=cleaned.lastIndexOf('}');
  if(start<0 || end<0) throw new Error('Respons AI tidak berisi JSON storyboard.');
  return JSON.parse(cleaned.slice(start,end+1));
}

function promptForGemini(){
  return `Analisis gambar produk yang saya kirim sebagai satu-satunya referensi visual. Buat storyboard iklan video 6 scene yang siap dipakai pada AI video generator.

ATURAN WAJIB:
- Tepat 6 scene, berurutan Scene 1 sampai Scene 6.
- Target video FINAL selalu native vertical 9:16 untuk smartphone.
- Pertahankan identitas, bentuk, warna, logo, material, dan detail produk dari gambar referensi. Jangan mengarang perubahan desain produk.
- Setiap scene memiliki: durasi, visual, gerakan, dan prompt.
- Prompt setiap scene harus spesifik tentang subjek, komposisi, kamera, gerakan kamera/objek, pencahayaan, kontinuitas produk, dan output vertical 9:16.
- Buat gerakan yang realistis dan mudah dipahami AI video generator.
- Hindari teks acak, watermark, produk berubah bentuk, tangan/jari ekstra, atau objek yang tidak relevan.
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
      "visual": "deskripsi visual",
      "motion": "arahan gerakan kamera dan/atau objek",
      "prompt": "prompt siap copy untuk AI video generator"
    }
  ],
  "master_prompt": "prompt induk siap copy"
}`;
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
    const base64=sourceDataUrl.split(',')[1];
    const mime=sourceDataUrl.slice(5,sourceDataUrl.indexOf(';'));
    const body={
      contents:[{
        parts:[
          {text:promptForGemini()},
          {inline_data:{mime_type:mime,data:base64}}
        ]
      }],
      generationConfig:{temperature:0.7,responseMimeType:'application/json'}
    };
    const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+encodeURIComponent(key),{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data?.error?.message || 'Gemini API gagal.');
    const text=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('') || '';
    storyboard=extractJson(text);
    renderStoryboard();
    setStoryStatus('Storyboard 6 scene selesai.');
  }catch(err){
    console.error(err);
    setStoryStatus('Gagal membuat storyboard: '+(err.message||err));
  }finally{
    generateBtn.disabled=false;
  }
}

function escapeHtml(v=''){
  return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function renderStoryboard(){
  const scenes=Array.isArray(storyboard?.scenes)?storyboard.scenes.slice(0,6):[];
  const cards=scenes.map(s=>`
    <article class="scene-card">
      <div class="scene-top"><span>SCENE ${escapeHtml(s.scene)}</span><span>${escapeHtml(s.duration)}</span></div>
      <img class="scene-image" src="${sourceDataUrl}" alt="Referensi scene">
      <div class="scene-label">Visual</div>
      <div class="scene-desc">${escapeHtml(s.visual)}</div>
      <div class="scene-label">Gerakan</div>
      <div class="scene-desc">${escapeHtml(s.motion)}</div>
      <div class="scene-label">Prompt Scene</div>
      <div class="scene-prompt">${escapeHtml(s.prompt)}</div>
    </article>`).join('');
  sheet.innerHTML=`
    <div class="story-title">${escapeHtml(storyboard?.title || 'Storyboard 6 Scene')}</div>
    <div class="story-format">MASTER FORMAT: NATIVE VERTICAL 9:16 · Smartphone Video</div>
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
  const html='<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeHtml(storyboard.title||'Storyboard 6 Scene')+'</title><style>body{font-family:Arial,sans-serif;background:#eee;margin:0;padding:20px;color:#111}.sheet{max-width:1100px;margin:auto;background:#fff;padding:20px}.scenes{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.card{border:1px solid #ccc;border-radius:10px;padding:10px;break-inside:avoid}.card img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:7px}.top{display:flex;justify-content:space-between;font-weight:bold;font-size:12px}.label{font-size:10px;font-weight:bold;color:#666;text-transform:uppercase;margin-top:7px}.desc{font-size:11px;line-height:1.4}.prompt{font:10px/1.4 monospace;background:#f1f1f1;padding:7px;border-radius:6px;white-space:pre-wrap}.master{margin-top:12px;border:1px solid #ccc;padding:10px;border-radius:10px}.master p{font:10px/1.4 monospace;white-space:pre-wrap}@media(max-width:700px){.scenes{grid-template-columns:1fr}}@media print{body{background:#fff;padding:0}.sheet{max-width:none}}</style></head><body><main class="sheet"><h1>'+escapeHtml(storyboard.title||'Storyboard 6 Scene')+'</h1><p>NATIVE VERTICAL 9:16 · Smartphone Video</p><section class="scenes">'+storyboard.scenes.slice(0,6).map(s=>'<article class="card"><div class="top"><span>SCENE '+escapeHtml(s.scene)+'</span><span>'+escapeHtml(s.duration)+'</span></div><img src="'+sourceDataUrl+'" alt="Referensi"><div class="label">Visual</div><div class="desc">'+escapeHtml(s.visual)+'</div><div class="label">Gerakan</div><div class="desc">'+escapeHtml(s.motion)+'</div><div class="label">Prompt Scene</div><div class="prompt">'+escapeHtml(s.prompt)+'</div></article>').join('')+'</section><section class="master"><h3>MASTER PROMPT</h3><p>'+escapeHtml(storyboard.master_prompt||'')+'</p></section></main></body></html>';
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='iwan-storyboard-6-scene.html';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  setStoryStatus('Storyboard sudah di-download. Bisa dibuka atau Print → Save as PDF.');
}

generateBtn.addEventListener('click',generateStoryboard);
downloadBtn.addEventListener('click',downloadStoryboard);
