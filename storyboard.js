const storyImageEl=document.querySelector('#storyImage');
const storyDrop=document.querySelector('#storyDrop');
const keyEl=document.querySelector('#geminiKey');
const generateBtn=document.querySelector('#generateStoryboard');
const copyMasterBtn=document.querySelector('#copyMasterPrompt');
const storyStatus=document.querySelector('#storyStatus');
const sheet=document.querySelector('#storyboardSheet');
const saveKeyBtn=document.querySelector('#saveGeminiKey');
const keySaveStatus=document.querySelector('#keySaveStatus');

let sourceDataUrl='';
let masterPrompt='';

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
  setStoryStatus('Gambar referensi siap. Klik “Buat Prompt 6 Scene · 12 Detik”.');
}
storyImageEl?.addEventListener('change',e=>setSource(e.target.files?.[0]));
storyDrop?.addEventListener('dragover',e=>e.preventDefault());
storyDrop?.addEventListener('drop',async e=>{e.preventDefault();await setSource(e.dataTransfer.files?.[0])});

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

function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

async function callGemini(key){
  const base64=sourceDataUrl.split(',')[1];
  const mime=sourceDataUrl.slice(5,sourceDataUrl.indexOf(';'));

  // Google now recommends Interactions API for new Gemini integrations.
  // Try current stable Flash models in order; do not keep hammering one overloaded model.
  const models=['gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash','gemini-3.5-flash-lite'];
  let last='Gemini tidak dapat membuat master prompt.';

  for(const model of models){
    try{
      const ctl=new AbortController();
      const tid=setTimeout(()=>ctl.abort(),60000);
      let res;
      try{
        res=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{
          method:'POST',
          headers:{'Content-Type':'application/json','x-goog-api-key':key},
          body:JSON.stringify({
            model,
            store:false,
            input:[
              {
                type:'image',
                mime_type:mime,
                data:base64
              },
              {
                type:'text',
                text:storyboardInstruction()
              }
            ],
            generation_config:{
              max_output_tokens:4096
            }
          }),
          signal:ctl.signal
        });
      }finally{clearTimeout(tid)}

      const raw=await res.text();
      let data={};
      try{data=raw?JSON.parse(raw):{}}catch(e){}

      if(res.ok){
        const parts=[];
        for(const step of (data?.steps||[])){
          if(step?.type==='model_output'){
            for(const part of (step?.content||[])){
              if(part?.type==='text'&&part.text)parts.push(part.text);
            }
          }
        }
        const text=parts.join('').trim()||data?.output_text?.trim()||'';
        if(text)return text;
        last='Gemini '+model+' selesai tetapi tidak mengembalikan teks.';
        continue;
      }

      const msg=data?.error?.message||('HTTP '+res.status+' dari Gemini '+model+'.');
      last=msg;

      // 400/401/403/404 are configuration/auth/model errors; continuing to another
      // model will not reliably fix the key, so surface the exact error.
      if([400,401,403,404].includes(res.status))throw Error(msg);

      // 429/500/502/503/504 can be transient. Respect Retry-After when supplied,
      // but only retry once so the browser does not hammer an overloaded service.
      const retryable=[429,500,502,503,504].includes(res.status);
      if(retryable){
        const retryAfter=Number(res.headers.get('retry-after'));
        const waitMs=Number.isFinite(retryAfter)&&retryAfter>0
          ?Math.min(retryAfter*1000,15000)
          :3000;
        await sleep(waitMs);
        continue;
      }
    }catch(e){
      if(e?.name==='AbortError')last='Timeout 60 detik saat menghubungi Gemini '+model+'.';
      else last=e?.message||String(e);
      if(/API key|permission|unauthorized|forbidden|not found|invalid/i.test(last))throw Error(last);
    }
  }

  throw Error('Semua model Gemini yang dicoba sedang tidak dapat melayani permintaan. Detail terakhir: '+last);
}

function esc(v=''){
  return String(v).replace(/[&<>\\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\':'&quot;','"':'&quot;'}[c]));
}

function render(){
  sheet.innerHTML='<div class="story-title">MASTER PROMPT — GOOGLE FLOW</div><div class="story-format">9:16 · 6 SCENE · 12 DETIK</div><pre class="master-prompt">'+esc(masterPrompt)+'</pre>';
}

async function generate(){
  if(!sourceDataUrl){setStoryStatus('Upload 1 gambar produk terlebih dahulu.');return}
  const key=keyEl?.value.trim()||localStorage.getItem('iwan_gemini_api_key')||'';
  if(!key){setStoryStatus('Masukkan API key Gemini terlebih dahulu.');keyEl?.focus();return}
  localStorage.setItem('iwan_gemini_api_key',key);
  generateBtn.disabled=true;
  setStoryStatus('Gemini sedang membaca gambar dan menyusun master prompt 6 scene…');
  try{
    masterPrompt=await callGemini(key);
    render();
    setStoryStatus('✓ Master Prompt 6 scene · 12 detik siap di-copy ke Google Flow.');
  }catch(e){
    setStoryStatus('Gagal: '+(e.message||e));
  }finally{generateBtn.disabled=false}
}

generateBtn?.addEventListener('click',generate);

copyMasterBtn?.addEventListener('click',async()=>{
  if(!masterPrompt){setStoryStatus('Buat prompt terlebih dahulu.');return}
  await navigator.clipboard.writeText(masterPrompt);
  setStoryStatus('✓ Master Prompt sudah di-copy untuk Google Flow.');
});
