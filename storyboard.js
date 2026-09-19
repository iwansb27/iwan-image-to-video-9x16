const storyImageEl=document.querySelector('#storyImage');
const storyPreview=document.querySelector('#storySourcePreview');
const storyDrop=document.querySelector('#storyDrop');
const keyEl=document.querySelector('#geminiKey');
const generateBtn=document.querySelector('#generateStoryboard');
const copyMasterBtn=document.querySelector('#copyMasterPrompt');
const downloadBtn=document.querySelector('#downloadStoryboard');
const storyStatus=document.querySelector('#storyStatus');
const sheet=document.querySelector('#storyboardSheet');
const saveKeyBtn=document.querySelector('#saveGeminiKey');
const keySaveStatus=document.querySelector('#keySaveStatus');

let sourceDataUrl='';
let storyboard=null;

function setStoryStatus(t){if(storyStatus)storyStatus.textContent=t}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
function loadKey(){
  try{
    const k=localStorage.getItem('iwan_gemini_api_key')||'';
    if(keyEl)keyEl.value=k;
    if(k){
      keySaveStatus.textContent='API key tersimpan di browser.';
      if(saveKeyBtn){saveKeyBtn.textContent='Tersimpan ✓';saveKeyBtn.disabled=true}
    }
  }catch(e){}
}
function saveKey(e){
  e?.preventDefault();
  const k=keyEl?.value.trim()||'';
  if(!k){keySaveStatus.textContent='Masukkan API key Gemini.';return}
  try{
    localStorage.setItem('iwan_gemini_api_key',k);
    keySaveStatus.textContent='✓ API key tersimpan di browser.';
    if(saveKeyBtn){saveKeyBtn.textContent='Tersimpan ✓';saveKeyBtn.disabled=true}
  }catch(e){keySaveStatus.textContent='✕ Tidak bisa menyimpan API key.'}
}
loadKey();
saveKeyBtn?.addEventListener('click',saveKey);

async function setSource(file){
  if(!file||!file.type.startsWith('image/'))return;
  sourceDataUrl=await fileToDataUrl(file);
  storyPreview.src=sourceDataUrl;
  storyPreview.hidden=false;
  setStoryStatus('Gambar referensi siap. Klik “Buat Storyboard 6 Scene”.');
}
storyImageEl?.addEventListener('change',e=>setSource(e.target.files?.[0]));
storyDrop?.addEventListener('dragover',e=>e.preventDefault());
storyDrop?.addEventListener('drop',async e=>{e.preventDefault();await setSource(e.dataTransfer.files?.[0])});

function extractJson(t){
  const c=t.replace(/\`\`\`json/gi,'').replace(/\`\`\`/g,'').trim();
  const a=c.indexOf('{'),b=c.lastIndexOf('}');
  if(a<0||b<0)throw Error('Gemini tidak mengembalikan JSON storyboard.');
  return JSON.parse(c.slice(a,b+1));
}

function storyboardInstruction(){
return `Buat storyboard iklan produk berdasarkan SATU gambar reference yang saya kirim.

TUJUAN: hasilnya akan langsung dipakai untuk Google Flow membuat video vertikal 9:16.

Buat TEPAT 6 SCENE. Jangan membuat gambar baru dan jangan meminta 6 gambar berbeda. Reference image yang sama menjadi acuan identitas produk untuk semua scene.

Aturan:
1. Identifikasi produk dari reference image.
2. Pertahankan bentuk, warna, logo, material, ukuran relatif, konektor, tombol, tekstur dan detail fisik produk. Jangan redesign.
3. Abaikan elemen marketplace/screenshot yang tidak relevan: status bar, harga, rating, tombol belanja, seller, menu, notifikasi, dan UI.
4. Susun alur iklan: hook → product reveal → penggunaan → manfaat → detail → hero/closing.
5. Semua scene native vertical 9:16.
6. Visual harus bersih, realistis, sinematik, product-focused.
7. Gerakan harus realistis dan mudah dianimasikan Google Flow: camera push-in, pull-back, pan, orbit, tilt, rack focus, object movement yang wajar.
8. Hindari gerakan yang membuat bentuk produk berubah atau tidak konsisten.
9. Setiap prompt scene harus berupa prompt bahasa Inggris yang siap ditempel ke Google Flow.
10. Setiap prompt harus menyebut bahwa produk berasal dari supplied reference image dan identitas produk harus dipertahankan.
11. Jangan membuat teks/watermark acak di video.
12. Master prompt harus menggabungkan keenam scene secara berurutan dan menegaskan bahwa satu reference image digunakan untuk menjaga konsistensi produk.

Keluarkan HANYA JSON valid dengan struktur:
{
  "title":"...",
  "scenes":[
    {"scene":1,"duration":"0-3s","visual":"...","motion":"...","prompt":"..."},
    {"scene":2,"duration":"3-6s","visual":"...","motion":"...","prompt":"..."},
    {"scene":3,"duration":"6-9s","visual":"...","motion":"...","prompt":"..."},
    {"scene":4,"duration":"9-12s","visual":"...","motion":"...","prompt":"..."},
    {"scene":5,"duration":"12-15s","visual":"...","motion":"...","prompt":"..."},
    {"scene":6,"duration":"15-18s","visual":"...","motion":"...","prompt":"..."}
  ],
  "master_prompt":"..."
}`;
}

async function callGemini(key){
  const base64=sourceDataUrl.split(',')[1];
  const mime=sourceDataUrl.slice(5,sourceDataUrl.indexOf(';'));
  const models=['gemini-3.8-flash','gemini-2.5-flash'];
  let last='Gemini gagal memproses storyboard.';
  for(const model of models){
    try{
      const ctl=new AbortController();
      const tid=setTimeout(()=>ctl.abort(),45000);
      let res;
      try{
        res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{
          method:'POST',
          headers:{'Content-Type':'application/json','x-goog-api-key':key},
          body:JSON.stringify({
            contents:[{
              parts:[
                {inline_data:{mime_type:mime,data:base64}},
                {text:storyboardInstruction()}
              ]
            }],
            generationConfig:{
              response_mime_type:'application/json',
              temperature:0.35
            }
          }),
          signal:ctl.signal
        });
      }finally{clearTimeout(tid)}
      const data=await res.json();
      if(res.ok){
        const text=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
        if(!text)throw Error('Gemini tidak mengembalikan isi storyboard.');
        return extractJson(text);
      }
      last=data?.error?.message||('Gemini gagal pada '+model+'.');
      if(res.status!==429&&res.status<500)throw Error(last);
    }catch(e){
      last=e?.name==='AbortError'?'Timeout 45 detik.':(e.message||String(e));
    }
  }
  throw Error(last);
}

function esc(v=''){
  return String(v).replace(/[&<>\\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\':'&quot;',"'":'&#039;'}[c]));
}

function render(){
  const scenes=(storyboard?.scenes||[]).slice(0,6);
  sheet.innerHTML=
    '<div class="story-title">'+esc(storyboard?.title||'Storyboard 6 Scene')+'</div>'+
    '<div class="story-format">9:16 · 1 REFERENCE IMAGE · 6 PROMPT GOOGLE FLOW</div>'+
    '<div class="story-scenes">'+
    scenes.map(s=>
      '<article class="scene-card">'+
      '<div class="scene-top"><span>SCENE '+esc(s.scene)+'</span><span>'+esc(s.duration)+'</span></div>'+
      '<img class="scene-image" src="'+sourceDataUrl+'" alt="Reference produk">'+
      '<div class="scene-reference-note">REFERENCE YANG SAMA · JANGAN REDESIGN PRODUK</div>'+
      '<div class="scene-label">Visual</div><div class="scene-desc">'+esc(s.visual)+'</div>'+
      '<div class="scene-label">Gerakan</div><div class="scene-desc">'+esc(s.motion)+'</div>'+
      '<div class="scene-label">Prompt Google Flow</div><div class="scene-prompt">'+esc(s.prompt)+'</div>'+
      '</article>'
    ).join('')+
    '</div>'+
    '<div class="master-box"><h3>MASTER PROMPT — GOOGLE FLOW</h3><p>'+esc(storyboard?.master_prompt||'')+'</p></div>';
}

async function generate(){
  if(!sourceDataUrl){setStoryStatus('Upload 1 gambar produk terlebih dahulu.');return}
  const key=keyEl?.value.trim()||localStorage.getItem('iwan_gemini_api_key')||'';
  if(!key){setStoryStatus('Masukkan API key Gemini terlebih dahulu.');keyEl?.focus();return}
  localStorage.setItem('iwan_gemini_api_key',key);
  generateBtn.disabled=true;
  setStoryStatus('Gemini sedang membaca gambar dan menyusun 6 scene…');
  try{
    storyboard=await callGemini(key);
    if(!Array.isArray(storyboard.scenes)||storyboard.scenes.length!==6)throw Error('Storyboard tidak berisi tepat 6 scene.');
    storyboard.scenes=storyboard.scenes.map((s,i)=>({
      scene:i+1,
      duration:s.duration||((i*3)+'-'+((i+1)*3)+'s'),
      visual:s.visual||'',
      motion:s.motion||'',
      prompt:s.prompt||''
    }));
    render();
    setStoryStatus('✓ Storyboard 6 scene selesai. Prompt siap dipakai di Google Flow.');
  }catch(e){
    setStoryStatus('Gagal: '+(e.message||e));
  }finally{generateBtn.disabled=false}
}

generateBtn?.addEventListener('click',generate);

copyMasterBtn?.addEventListener('click',async()=>{
  if(!storyboard?.master_prompt){setStoryStatus('Buat storyboard terlebih dahulu.');return}
  await navigator.clipboard.writeText(storyboard.master_prompt);
  setStoryStatus('✓ Master Prompt sudah di-copy.');
});

function download(){
  if(!storyboard){setStoryStatus('Buat storyboard terlebih dahulu.');return}
  const html='<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+
    esc(storyboard.title||'Storyboard 6 Scene')+
    '</title><style>body{font-family:Arial;background:#eee;padding:20px;color:#111}.sheet{max-width:1100px;margin:auto;background:#fff;padding:20px}.scenes{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.card{border:1px solid #ccc;border-radius:10px;padding:10px}.card img{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:7px}.top{display:flex;justify-content:space-between;font-weight:bold}.label{font-size:10px;font-weight:bold;color:#666;margin-top:7px}.desc{font-size:11px}.prompt,.master p{font:10px/1.4 monospace;white-space:pre-wrap;background:#f1f1f1;padding:7px;border-radius:6px}.master{margin-top:12px;border:1px solid #ccc;padding:10px}@media(max-width:700px){.scenes{grid-template-columns:1fr}}</style></head><body><main class="sheet"><h1>'+
    esc(storyboard.title||'Storyboard 6 Scene')+
    '</h1><p>9:16 · 1 REFERENCE IMAGE · GOOGLE FLOW</p><section class="scenes">'+
    storyboard.scenes.map(s=>'<article class="card"><div class="top"><span>SCENE '+esc(s.scene)+'</span><span>'+esc(s.duration)+'</span></div><img src="'+sourceDataUrl+'" alt="Reference produk"><div class="label">Visual</div><div class="desc">'+esc(s.visual)+'</div><div class="label">Gerakan</div><div class="desc">'+esc(s.motion)+'</div><div class="label">Prompt Google Flow</div><div class="prompt">'+esc(s.prompt)+'</div></article>').join('')+
    '</section><section class="master"><h3>MASTER PROMPT — GOOGLE FLOW</h3><p>'+esc(storyboard.master_prompt||'')+'</p></section></main></body></html>';
  const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));
  const a=document.createElement('a');a.href=url;a.download='iwan-storyboard-6-scene.html';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  setStoryStatus('✓ Storyboard sudah di-download.');
}
downloadBtn?.addEventListener('click',download);
