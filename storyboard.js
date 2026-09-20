const storyImageEl=document.querySelector('#storyImage');
const storyDrop=document.querySelector('#storyDrop');
const keyEl=document.querySelector('#geminiKey');
const generateBtn=document.querySelector('#generateStoryboard');
const copyMasterBtn=document.querySelector('#copyMasterPrompt');
const copyExtendBtn=document.querySelector('#copyExtendPrompt');
const downloadMasterBtn=document.querySelector('#downloadMasterPrompt');
const storyStatus=document.querySelector('#storyStatus');
const sheet=document.querySelector('#storyboardSheet');
const saveKeyBtn=document.querySelector('#saveGeminiKey');
const keySaveStatus=document.querySelector('#keySaveStatus');

let sourceDataUrl='';
let masterPrompt='';
let extendInstruction='';

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
Create exactly TWO copy-ready instruction blocks for Google Flow. The user will give the SAME product screenshot to Google Flow as the visual reference. Gemini only reads the screenshot and writes text. Gemini does NOT create a video, does NOT create images, and does NOT create a storyboard image.

WORKFLOW
- The user may stop after the first 8-second generation.
- The user may optionally use Google Flow's Extend function to add another 8 seconds.
- Therefore, generate one MASTER PROMPT for the first 8-second video and one EXTEND INSTRUCTION for the optional second 8 seconds.
- Do NOT create Prompt 1 and Prompt 2.
- Do NOT create three prompts.
- Do NOT create a 16-second prompt that must be generated in one operation.
- The EXTEND INSTRUCTION is specifically for Google Flow Extend after the first 8-second clip already exists. It is not a replacement for the MASTER PROMPT and it must not restart the video.

FIRST GENERATION — MASTER PROMPT
Write one complete MASTER PROMPT for a standalone video of EXACTLY 8 seconds in native vertical 9:16.
The 8 seconds must contain EXACTLY 4 distinct, fast commercial shots inside the same generation.
The ending must feel complete and intentional so the user can stop at 8 seconds without the video feeling unfinished.
Use this structure:
SHOT 1: opening hook / establish the product.
SHOT 2: a different angle or controlled movement revealing a visible product characteristic.
SHOT 3: a close-up, detail, or realistic human interaction ONLY when supported by the screenshot; otherwise use a controlled detail reveal.
SHOT 4: premium final hero composition with a clean, deliberate ending.
Each shot must have its own framing and movement. Do not make the whole video one continuous orbit.

OPTIONAL EXTENSION — EXTEND INSTRUCTION
Write one separate, copy-ready EXTEND INSTRUCTION for Google Flow Extend that adds EXACTLY 8 more seconds to the existing first clip.
It must explicitly say to continue from the CURRENT END of the existing clip, not restart from the beginning.
It must preserve the exact same product identity, visual world, lighting direction, camera language, and any person/model continuity established in the first clip.
Create EXACTLY 4 NEW, fast commercial shots during the added 8 seconds.
Do not repeat the four visual beats from the first 8 seconds.
The extension should feel like the same continuous commercial, with a natural handoff from the final frame of the first clip into the first moment of the extension.
End the extension with a deliberate final hero composition suitable as the end of a 16-second version.
The Extend Instruction must be usable by itself in the Extend prompt field after the first 8-second clip exists; do not tell the user to paste the MASTER PROMPT again.

REFERENCE DISCIPLINE
1. Identify the actual product shown in the CURRENT screenshot.
2. Use only visible, verifiable characteristics: shape, proportions, color, material/texture, markings, branding, controls, openings, accessories, and other clearly visible details.
3. Never assume a product category from previous examples or outside knowledge.
4. Never invent hidden mechanisms, specifications, dimensions, ingredients, performance claims, accessories, materials, colors, or functions.
5. If a detail is uncertain or hidden, omit it.
6. Remove marketplace UI from the visual concept: price, rating, seller information, shopping buttons, status bars, notifications, menus, and unrelated overlays.
7. Keep the real product as the hero subject. Do not replace, redesign, duplicate, morph, or merge it.
8. If a human figure/model is used, it must be realistic and consistent across the extension. Do not invent a person if it is not useful.

GLOBAL VISUAL RULES
- Native vertical 9:16.
- Exactly 8 seconds per generation.
- Exactly 4 shots per 8-second generation.
- Visual only: NO spoken dialogue, NO narration, NO music, NO sound effects, NO captions/subtitles unless text is physically printed on the real product and clearly visible in the reference.
- Clean commercial cinematic look.
- Realistic lighting, physically plausible motion, stable product geometry, and natural camera movement.
- Product identity must remain faithful to the supplied screenshot.
- Use the attached screenshot as the sole product identity reference.
- Do not create AI images or storyboard images.
- Do not add unsupported claims or invented features.

CONTINUITY RULE FOR EXTEND
The second 8 seconds is an extension of the already generated first 8 seconds. The instruction must begin from the existing clip's final visual state and continue forward. Do not restart, reset the environment, change the product, or introduce an unrelated scene.

LANGUAGE
Write both blocks in English because the user will paste them into Google Flow.

RETURN FORMAT
Return ONLY valid JSON with exactly these keys:
{
  "master_prompt": "...",
  "extend_instruction": "..."
}
No markdown fences. No explanation before or after the JSON.

SELF-CHECK
Before returning JSON:
- Confirm there are exactly two keys.
- Confirm MASTER PROMPT is for a complete standalone 8-second video.
- Confirm EXTEND INSTRUCTION is for Google Flow Extend and adds 8 seconds to the existing clip.
- Confirm neither block asks for audio.
- Confirm neither block creates images or storyboard images.
- Confirm the extension does not restart or repeat the first 8 seconds.
- Delete unsupported product details rather than guessing.`;
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
        text=text.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim();
        try{
          const parsed=JSON.parse(text);
          if(parsed?.master_prompt&&parsed?.extend_instruction&&!parsed?.prompt_1&&!parsed?.prompt_2)return parsed;
          last='Gemini mengembalikan format yang tidak sesuai.';
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
    '<div class="prompt-block"><div class="prompt-head"><strong>MASTER PROMPT · 8 DETIK</strong><span>Generate pertama · selesai di 8 detik</span></div><pre class="master-prompt">'+esc(masterPrompt)+'</pre></div>'+
    '<div class="prompt-block"><div class="prompt-head"><strong>EXTEND INSTRUCTION · +8 DETIK</strong><span>Google Flow Extend · lanjut dari klip pertama</span></div><pre class="master-prompt">'+esc(extendInstruction)+'</pre></div>';
}

async function generate(){
  if(!sourceDataUrl){setStoryStatus('Upload 1 screenshot produk terlebih dahulu.');return}
  const key=keyEl?.value.trim()||localStorage.getItem('iwan_gemini_api_key')||'';
  if(!key){setStoryStatus('Masukkan API key Gemini terlebih dahulu.');keyEl?.focus();return}
  localStorage.setItem('iwan_gemini_api_key',key);
  generateBtn.disabled=true;
  setStoryStatus('Gemini sedang membaca screenshot dan membuat MASTER PROMPT + EXTEND INSTRUCTION…');
  try{
    const result=await callGemini(key);
    masterPrompt=result.master_prompt.trim();
    extendInstruction=result.extend_instruction.trim();
    render();
    setStoryStatus('✓ Selesai: MASTER PROMPT = 8 detik selesai. EXTEND INSTRUCTION = +8 detik bila ingin total 16 detik. Tanpa audio.');
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
copyExtendBtn?.addEventListener('click',()=>copyText(extendInstruction,'EXTEND INSTRUCTION'));

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