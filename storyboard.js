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
let sourceDataUrl='',storyboard=null,storyTimerId=null,storyStartedAt=0,storyProgressScene=0;

function setStoryStatus(t){if(storyStatus)storyStatus.textContent=t}
function lockKey(){if(keyEl){keyEl.readOnly=true;keyEl.disabled=true}if(saveKeyBtn){saveKeyBtn.disabled=true;saveKeyBtn.textContent='API Key Tersimpan ✓'}}
function unlockKey(){if(keyEl){keyEl.readOnly=false;keyEl.disabled=false}if(saveKeyBtn){saveKeyBtn.disabled=false;saveKeyBtn.textContent='Simpan API Key'}}
function loadKey(){try{const k=localStorage.getItem('iwan_gemini_api_key')||'';keyEl.value=k;if(k){keySaveStatus.textContent='API key tersimpan di browser.';lockKey()}else unlockKey()}catch(e){unlockKey()}}
function saveKey(e){e?.preventDefault();const k=keyEl.value.trim();if(!k){keySaveStatus.textContent='API key masih kosong.';return}try{localStorage.setItem('iwan_gemini_api_key',k);keySaveStatus.textContent='✓ API key tersimpan di browser.';lockKey()}catch(e){keySaveStatus.textContent='✕ Gagal menyimpan API key.'}}
loadKey();saveKeyBtn?.addEventListener('click',saveKey);keyEl?.addEventListener('change',saveKey);

function elapsed(ms){const s=Math.floor(ms/1000),m=Math.floor(s/60);return String(m).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function startTimer(){clearInterval(storyTimerId);storyStartedAt=Date.now();storyProgressScene=0;storyTimerId=setInterval(()=>progress(storyProgressScene),250);progress(0)}
function stopTimer(){clearInterval(storyTimerId);storyTimerId=null}
function progress(n=storyProgressScene,phase=''){storyProgressScene=Math.max(0,Math.min(6,n));setStoryStatus(`Waktu ${elapsed(Date.now()-storyStartedAt)} · Scene ${storyProgressScene}/6${phase?' · '+phase:''}`)}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
async function setSource(file){if(!file||!file.type.startsWith('image/'))return;sourceDataUrl=await fileToDataUrl(file);storyPreview.src=sourceDataUrl;storyPreview.hidden=false;setStoryStatus('1 gambar referensi siap. Gambar ini akan dipakai ulang pada semua 6 scene.')}
storyImageEl?.addEventListener('change',e=>setSource(e.target.files?.[0]));
storyDrop?.addEventListener('dragover',e=>e.preventDefault());
storyDrop?.addEventListener('drop',async e=>{e.preventDefault();await setSource(e.dataTransfer.files?.[0])});

function extractJson(t){const c=t.replace(/\`\`\`json/gi,'').replace(/\`\`\`/g,'').trim(),a=c.indexOf('{'),b=c.lastIndexOf('}');if(a<0||b<0)throw Error('Respons AI tidak berisi JSON storyboard.');return JSON.parse(c.slice(a,b+1))}
function storyboardInstruction(){return `Analisis gambar produk yang saya kirim sebagai SATU REFERENSI VISUAL. Buat storyboard iklan tepat 6 scene untuk Google Flow.

PENTING: JANGAN membuat gambar baru. SATU gambar referensi yang sama akan ditampilkan pada semua 6 scene. Yang berbeda hanya keterangan visual, gerakan, dan prompt untuk Google Flow.

Aturan:
- Tepat 6 scene, urut 1-6.
- Video final native vertical 9:16.
- Pertahankan produk yang sama: bentuk, warna, logo, material, konektor, tombol dan detail fisik.
- Jangan mengubah desain produk.
- Alur: hook → tampilkan produk → penggunaan → manfaat → detail/hero → closing/CTA.
- Setiap scene wajib memiliki duration, visual, motion, prompt.
- Prompt ditujukan untuk Google Flow yang menghidupkan/menganimasikan reference image, bukan generator gambar.
- Jelaskan gerakan kamera dan/atau objek secara realistis, sinematik, dan product-focused.
- Google Flow harus mengabaikan status bar HP, marketplace UI, harga, rating, tombol belanja, seller info, menu, notifikasi, dan elemen screenshot yang tidak relevan.
- Jangan buat watermark atau teks acak.
- Setiap prompt wajib menyebut produk yang sama dari reference image dan native vertical 9:16.
- Master prompt wajib menegaskan satu reference image yang sama untuk keenam scene; Google Flow yang membuat variasi gerak/adegan.
- Jangan masukkan markdown dalam JSON.

Keluarkan HANYA JSON:
{"title":"judul storyboard","scenes":[{"scene":1,"duration":"0-3 detik","visual":"deskripsi adegan","motion":"gerakan kamera/objek","prompt":"prompt siap copy untuk Google Flow"}],"master_prompt":"prompt induk siap copy untuk Google Flow"}`}
async function callGemini(key){
 const base64=sourceDataUrl.split(',')[1],mime=sourceDataUrl.slice(5,sourceDataUrl.indexOf(';'));
 const models=['gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash'];let last='Gemini gagal memproses storyboard.';
 for(const model of models)for(let attempt=0;attempt<2;attempt++){try{
  const ctl=new AbortController(),tid=setTimeout(()=>ctl.abort(),45000);
  let res;try{res=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({model,input:[{type:'image',mime_type:mime,data:base64},{type:'text',text:storyboardInstruction()}],response_format:{type:'text',mime_type:'application/json'}}),signal:ctl.signal})}finally{clearTimeout(tid)}
  const data=await res.json();if(res.ok){const text=data?.steps?.filter(s=>s.type==='model_output')?.flatMap(s=>s.content||[]).filter(x=>x.type==='text').map(x=>x.text||'').join('')||'';if(!text)throw Error('Gemini tidak mengembalikan storyboard.');return extractJson(text)}
  last=data?.error?.message||('Gemini gagal pada '+model+'.');if(!(res.status===429||res.status>=500))throw Error(last)
 }catch(e){last=e?.name==='AbortError'?'Gemini timeout setelah 45 detik.':(e.message||String(e))}if(attempt===0)await new Promise(r=>setTimeout(r,1200))}
 throw Error(last)
}
function esc(v=''){return String(v).replace(/[&<>\\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\"':'&quot;',"'":'&#039;'}[c]))}
function render(){
 const scenes=(storyboard?.scenes||[]).slice(0,6);
 sheet.innerHTML='<div class="story-title">'+esc(storyboard?.title||'Storyboard 6 Scene')+'</div><div class="story-format">NATIVE VERTICAL 9:16 · 1 REFERENCE IMAGE · 6 SCENE PROMPTS · GOOGLE FLOW</div><div class="story-scenes">'+scenes.map(s=>'<article class="scene-card"><div class="scene-top"><span>SCENE '+esc(s.scene)+'</span><span>'+esc(s.duration)+'</span></div><img class="scene-image" src="'+sourceDataUrl+'" alt="Gambar referensi produk"><div class="scene-reference-note">1 GAMBAR SAMA · GOOGLE FLOW MENGATUR GERAKAN</div><div class="scene-label">Visual</div><div class="scene-desc">'+esc(s.visual)+'</div><div class="scene-label">Gerakan</div><div class="scene-desc">'+esc(s.motion)+'</div><div class="scene-label">Prompt Scene — GOOGLE FLOW</div><div class="scene-prompt">'+esc(s.prompt)+'</div></article>').join('')+'</div><div class="master-box"><h3>MASTER PROMPT — COPY KE GOOGLE FLOW</h3><p>'+esc(storyboard?.master_prompt||'')+'</p></div>'
}
async function generate(){
 if(!sourceDataUrl){setStoryStatus('Upload screenshot produk terlebih dahulu.');return}
 const key=keyEl.value.trim();if(!key){setStoryStatus('Masukkan API key Gemini terlebih dahulu.');keyEl.focus();return}
 localStorage.setItem('iwan_gemini_api_key',key);generateBtn.disabled=true;startTimer();progress(0,'membaca gambar & menyusun 6 prompt');
 try{storyboard=await callGemini(key);storyboard.scenes=Array.isArray(storyboard.scenes)?storyboard.scenes.slice(0,6):[];if(storyboard.scenes.length!==6)throw Error('Gemini tidak menghasilkan tepat 6 scene.');render();stopTimer();setStoryStatus(`Storyboard selesai ${elapsed(Date.now()-storyStartedAt)} · Scene 6/6 ✓ · 1 gambar dipakai untuk semua scene.`)}
 catch(e){stopTimer();setStoryStatus(`Gagal setelah ${elapsed(Date.now()-storyStartedAt)} · ${e.message||e}`)}
 finally{generateBtn.disabled=false}
}
copyMasterBtn?.addEventListener('click',async()=>{if(!storyboard?.master_prompt){setStoryStatus('Buat storyboard terlebih dahulu.');return}await navigator.clipboard.writeText(storyboard.master_prompt);setStoryStatus('Master Prompt sudah di-copy.')});
function download(){
 if(!storyboard){setStoryStatus('Buat storyboard terlebih dahulu.');return}
 const html='<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(storyboard.title||'Storyboard 6 Scene')+'</title><style>body{font-family:Arial;background:#eee;padding:20px;color:#111}.sheet{max-width:1100px;margin:auto;background:#fff;padding:20px}.scenes{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.card{border:1px solid #ccc;border-radius:10px;padding:10px}.card img{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:7px}.top{display:flex;justify-content:space-between;font-weight:bold}.label{font-size:10px;font-weight:bold;color:#666;margin-top:7px}.desc{font-size:11px}.prompt,.master p{font:10px/1.4 monospace;white-space:pre-wrap;background:#f1f1f1;padding:7px;border-radius:6px}.master{margin-top:12px;border:1px solid #ccc;padding:10px}@media(max-width:700px){.scenes{grid-template-columns:1fr}}</style></head><body><main class="sheet"><h1>'+esc(storyboard.title||'Storyboard 6 Scene')+'</h1><p>NATIVE VERTICAL 9:16 · 1 REFERENCE IMAGE · GOOGLE FLOW</p><section class="scenes">'+storyboard.scenes.map(s=>'<article class="card"><div class="top"><span>SCENE '+esc(s.scene)+'</span><span>'+esc(s.duration)+'</span></div><img src="'+sourceDataUrl+'" alt="Gambar referensi"><div class="label">Visual</div><div class="desc">'+esc(s.visual)+'</div><div class="label">Gerakan</div><div class="desc">'+esc(s.motion)+'</div><div class="label">Prompt</div><div class="prompt">'+esc(s.prompt)+'</div></article>').join('')+'</section><section class="master"><h3>MASTER PROMPT — GOOGLE FLOW</h3><p>'+esc(storyboard.master_prompt||'')+'</p></section></main></body></html>';
 const url=URL.createObjectURL(new Blob([html],{type:'text/html'})),a=document.createElement('a');a.href=url;a.download='iwan-storyboard-6-scene.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStoryStatus('Storyboard sudah di-download.')
}
generateBtn?.addEventListener('click',generate);downloadBtn?.addEventListener('click',download);
