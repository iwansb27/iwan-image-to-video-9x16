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
return `Analisis SATU screenshot produk yang saya kirim. Console ini TIDAK membuat atau men-download gambar. Tugasmu HANYA membuat SATU MASTER PROMPT TEKS yang siap ditempel langsung ke Google Flow.

Google Flow nanti akan menerima screenshot produk yang SAMA sebagai reference image. Prompt ini harus mengarahkan Google Flow untuk membersihkan screenshot dan mengubahnya menjadi video iklan produk yang bersih, realistis, sinematik, native vertical 9:16, durasi TOTAL 12 DETIK.

Buat SATU rangkaian video kontinu dengan 6 scene berurutan, masing-masing sekitar 2 detik:
SCENE 1 0-2s: hook / pembuka produk
SCENE 2 2-4s: product reveal
SCENE 3 4-6s: penggunaan / demonstrasi
SCENE 4 6-8s: manfaat utama
SCENE 5 8-10s: detail produk / close-up
SCENE 6 10-12s: hero shot / closing

PENTING:
- Jangan membuat enam gambar berbeda.
- Jangan mengubah, mendesain ulang, atau mengganti produk.
- Gunakan screenshot yang diberikan sebagai satu-satunya reference identitas produk dari awal sampai akhir.
- Pertahankan bentuk, proporsi, warna, logo, material, tekstur, konektor, tombol, dan detail fisik produk.
- Bersihkan screenshot: hilangkan status bar, marketplace UI, harga, rating, tombol belanja, seller info, menu, notifikasi, watermark marketplace, dan elemen lain yang tidak terkait produk.
- Jika background screenshot tidak cocok, buat background produk yang bersih dan realistis tanpa mengubah produk.
- Tidak boleh ada teks acak, logo tambahan, watermark, atau artefak.
- Semua perubahan terjadi melalui gerakan kamera, pencahayaan, lingkungan, dan aksi yang realistis; bukan perubahan bentuk produk.
- Gerakan harus kontinu dan masuk akal dari scene ke scene: camera push-in, pan, tilt, orbit, rack focus, close-up, pull-back, atau gerakan objek yang wajar.
- Hindari morphing, deformasi, produk berubah bentuk, objek tambahan yang tidak masuk akal, tangan/jari cacat, dan gerakan kamera yang ekstrem.
- Setiap scene harus terasa sebagai kelanjutan scene sebelumnya, bukan enam klip yang terpisah.
- Total durasi tepat 12 detik.
- Output video final 9:16.
- Gaya visual: clean commercial product advertisement, realistic, premium, cinematic lighting, sharp product details.
- Prioritaskan produk tetap konsisten sepanjang video.

Keluarkan HANYA satu MASTER PROMPT dalam bahasa Inggris. Jangan keluarkan storyboard JSON, tabel, atau enam gambar. Master prompt harus sudah memuat seluruh urutan 6 scene, timing 0-12 detik, instruksi membersihkan screenshot, konsistensi produk, gerakan kamera, dan spesifikasi 9:16.`;
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
