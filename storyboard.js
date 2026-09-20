const storyImageEl=document.querySelector('#storyImage');
const storyDrop=document.querySelector('#storyDrop');
const keyEl=document.querySelector('#geminiKey');
const generateBtn=document.querySelector('#generateStoryboard');
const copyMasterBtn=document.querySelector('#copyMasterPrompt');
const copyPrompt1Btn=document.querySelector('#copyPrompt1');
const copyPrompt2Btn=document.querySelector('#copyPrompt2');
const downloadMasterBtn=document.querySelector('#downloadMasterPrompt');
const storyStatus=document.querySelector('#storyStatus');
const sheet=document.querySelector('#storyboardSheet');
const saveKeyBtn=document.querySelector('#saveGeminiKey');
const keySaveStatus=document.querySelector('#keySaveStatus');

let sourceDataUrl='';
let masterPrompt='';
let prompt1='';
let prompt2='';

const storyPreviewWrap=document.querySelector('#storyPreviewWrap');
const storyPreview=document.querySelector('#storyPreview');
const storyPreviewMeta=document.querySelector('#storyPreviewMeta');

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
  if(storyPreview){storyPreview.src=sourceDataUrl;storyPreviewWrap.hidden=false}
  if(storyPreviewMeta){storyPreviewMeta.textContent=file.name+' · '+Math.round(file.size/1024)+' KB'}
  setStoryStatus('✓ Screenshot siap. Gemini akan membaca gambar ini sebagai satu-satunya referensi produk.');
}
storyImageEl?.addEventListener('change',e=>setSource(e.target.files?.[0]));
storyDrop?.addEventListener('dragover',e=>e.preventDefault());
storyDrop?.addEventListener('drop',async e=>{e.preventDefault();await setSource(e.dataTransfer.files?.[0])});

function storyboardInstruction(){
return `Analyze ONLY the single product screenshot attached to this request.

PURPOSE
Create prompt instructions for Google Flow. The user will give the SAME screenshot to Google Flow as the visual reference. Gemini does NOT create a video, does NOT create images, and does NOT combine clips.

FINAL VIDEO DESIGN
- Native vertical 9:16.
- Each prompt generates ONE video of EXACTLY 8 seconds.
- Each 8-second video contains EXACTLY 4 distinct, fast commercial shots.
- The 4 shots are inside the same 8-second generation, not four separate 8-second videos.
- Suggested rhythm: about 2 seconds per shot, with natural variation where needed.
- Visual only: NO spoken dialogue, NO narration, NO music, NO sound effects, NO captions/subtitles unless text is physically printed on the real product and clearly visible in the reference.
- If a human figure/model is appropriate and visually useful, include a realistic figure/model. Do not invent a figure if it would distract from the product.
- Product identity must remain stable and faithful to the screenshot.

REFERENCE DISCIPLINE
1. Identify the actual product shown in the CURRENT screenshot.
2. Use only visible, verifiable characteristics: shape, proportions, color, material/texture, markings, branding, controls, openings, accessories, and other clearly visible details.
3. Never assume a product category from previous examples.
4. Never invent hidden mechanisms, specifications, dimensions, ingredients, performance claims, accessories, materials, colors, or functions.
5. If a detail is uncertain or hidden, omit it.
6. Remove marketplace UI from the visual concept: price, rating, seller information, shopping buttons, status bars, notifications, menus, and unrelated overlays.
7. Keep the real product as the hero subject. Do not replace, redesign, duplicate, morph, or merge it.

PROMPT 1 — FIRST 8 SECONDS
Write a complete Google Flow prompt for the FIRST 8-second video.
It must contain exactly 4 distinct shots:
SHOT 1: opening hook / establish product.
SHOT 2: a different angle or controlled movement that reveals a visible product feature.
SHOT 3: a close-up, detail, or realistic human interaction ONLY if supported by the screenshot; otherwise use a controlled detail reveal.
SHOT 4: premium final hero composition.
Every shot must have its own framing and movement. Do not make the whole video one continuous orbit.

PROMPT 2 — SECOND 8 SECONDS / CONTINUATION
Write a second complete Google Flow prompt for ANOTHER 8-second video that CONTINUES directly from the end of Prompt 1.
It must again contain exactly 4 distinct shots.
It is NOT a merged 16-second prompt.
It is NOT a repeat of Prompt 1.
The opening frame of Prompt 2 should logically continue the final visual state of Prompt 1: same product identity, same visual world, compatible lighting/background, and a natural continuation of the commercial story.
Use four NEW visual beats that reveal other visible aspects of the same product.
If Prompt 1 includes a person/model, preserve continuity of appearance and wardrobe in Prompt 2.
Prompt 2 must work as a standalone Google Flow generation after Prompt 1 has been generated.

MASTER PROMPT
Write one reusable MASTER PROMPT that defines the global visual rules for both Prompt 1 and Prompt 2. It must be grounded in the CURRENT screenshot and must tell Google Flow to use the attached screenshot as the sole product identity reference.
The master prompt must cover:
- exact 9:16 framing;
- product fidelity;
- clean commercial cinematic look;
- realistic lighting and physically plausible movement;
- marketplace UI removal;
- continuity rules;
- no unsupported claims or invented product features;
- visual-only output with no audio;
- exactly 4 shots per 8-second generation;
- Prompt 2 continuation rules.

IMPORTANT
The MASTER PROMPT, PROMPT 1 and PROMPT 2 must be written in English because they will be pasted into Google Flow.
Do not generate storyboard images.
Do not return six scenes.
Do not return JSON inside the prompt text.

RETURN FORMAT
Return ONLY valid JSON with exactly these keys:
{
  "master_prompt": "...",
  "prompt_1": "...",
  "prompt_2": "..."
}
No markdown fences. No explanation before or after the JSON.

SELF-CHECK
Before returning JSON, verify that every specific product feature and physical action is supported by the CURRENT screenshot. Delete unsupported details rather than guessing.`;
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

async function callGemini(key){
  const base64=sourceDataUrl.split(',')[1];
  const mime=sourceDataUrl.slice(5,sourceDataUrl.indexOf(';'));
  const models=['gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash','gemini-3.5-flash-lite'];
  let last='Gemini tidak dapat membuat prompt.';

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
              {type:'image',mime_type:mime,data:base64},
              {type:'text',text:storyboardInstruction()}
            ],
            generation_config:{max_output_tokens:6000}
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
        let text=parts.join('').trim()||data?.output_text?.trim()||'';
        text=text.replace(/^\`\`\`json\s*/,'').replace(/\s*\`\`\`$/,'').trim();
        try{
          const parsed=JSON.parse(text);
          if(parsed?.master_prompt&&parsed?.prompt_1&&parsed?.prompt_2)return parsed;
          last='Gemini mengembalikan format yang tidak lengkap.';
        }catch(e){
          last='Gemini mengembalikan JSON yang tidak valid.';
        }
        continue;
      }

      const msg=data?.error?.message||('HTTP '+res.status+' dari Gemini '+model+'.');
      last=msg;
      if([400,401,403,404].includes(res.status))throw Error(msg);
      if([429,500,502,503,504].includes(res.status)){
        const retryAfter=Number(res.headers.get('retry-after'));
        await sleep(Number.isFinite(retryAfter)&&retryAfter>0?Math.min(retryAfter*1000,15000):3000);
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
  return String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function render(){
  sheet.innerHTML=
    '<div class="story-title">GOOGLE FLOW PROMPT</div>'+
    '<div class="story-format">9:16 · 8 DETIK PER GENERATION · 4 SHOT · VISUAL ONLY</div>'+
    '<div class="prompt-block"><div class="prompt-head"><strong>MASTER PROMPT</strong></div><pre class="master-prompt">'+esc(masterPrompt)+'</pre></div>'+
    '<div class="prompt-block"><div class="prompt-head"><strong>PROMPT 1 · 8 DETIK</strong><span>Video pertama · 4 shot</span></div><pre class="master-prompt">'+esc(prompt1)+'</pre></div>'+
    '<div class="prompt-block"><div class="prompt-head"><strong>PROMPT 2 · LANJUTAN 8 DETIK</strong><span>Video kedua · 4 shot · lanjut dari Prompt 1</span></div><pre class="master-prompt">'+esc(prompt2)+'</pre></div>';
}

async function generate(){
  if(!sourceDataUrl){setStoryStatus('Upload 1 screenshot produk terlebih dahulu.');return}
  const key=keyEl?.value.trim()||localStorage.getItem('iwan_gemini_api_key')||'';
  if(!key){setStoryStatus('Masukkan API key Gemini terlebih dahulu.');keyEl?.focus();return}
  localStorage.setItem('iwan_gemini_api_key',key);
  generateBtn.disabled=true;
  setStoryStatus('Gemini sedang membaca screenshot dan membuat MASTER PROMPT + PROMPT 1 + PROMPT 2…');
  try{
    const result=await callGemini(key);
    masterPrompt=result.master_prompt.trim();
    prompt1=result.prompt_1.trim();
    prompt2=result.prompt_2.trim();
    render();
    setStoryStatus('✓ Selesai: 8 detik = 4 shot. Prompt 2 adalah lanjutan 8 detik bila ingin total 16 detik. Tanpa audio.');
  }catch(e){
    setStoryStatus('Gagal: '+(e.message||e));
  }finally{generateBtn.disabled=false}
}

async function copyText(text,label){
  if(!text){setStoryStatus('Buat prompt terlebih dahulu.');return}
  try{
    await navigator.clipboard.writeText(text);
    setStoryStatus('✓ '+label+' sudah di-copy.');
  }catch(e){setStoryStatus('Clipboard tidak tersedia. Pilih dan copy teks dari kotak prompt.')}
}
generateBtn?.addEventListener('click',generate);
copyMasterBtn?.addEventListener('click',()=>copyText(masterPrompt,'MASTER PROMPT'));
copyPrompt1Btn?.addEventListener('click',()=>copyText(prompt1,'PROMPT 1'));
copyPrompt2Btn?.addEventListener('click',()=>copyText(prompt2,'PROMPT 2'));

downloadMasterBtn?.addEventListener('click',()=>{
  if(!masterPrompt){setStoryStatus('Buat prompt terlebih dahulu.');return}
  const blob=new Blob([masterPrompt],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='IWAN_MASTER_PROMPT_GOOGLE_FLOW.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStoryStatus('✓ MASTER PROMPT berhasil diunduh sebagai TXT.');
});
