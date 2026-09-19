const storyImageEl=document.querySelector('#storyImage');
const storyDrop=document.querySelector('#storyDrop');
const keyEl=document.querySelector('#geminiKey');
const generateBtn=document.querySelector('#generateStoryboard');
const copyMasterBtn=document.querySelector('#copyMasterPrompt');
const flowDurationEl=document.querySelector('#flowDuration');
const storyStatus=document.querySelector('#storyStatus');
const sheet=document.querySelector('#storyboardSheet');
const saveKeyBtn=document.querySelector('#saveGeminiKey');
const keySaveStatus=document.querySelector('#keySaveStatus');

let sourceDataUrl='';
let masterPrompt='';
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
  setStoryStatus('✓ Screenshot berhasil di-upload dan tampil di preview. Periksa gambar ini terlebih dahulu sebelum membuat prompt.');
}
storyImageEl?.addEventListener('change',e=>setSource(e.target.files?.[0]));
storyDrop?.addEventListener('dragover',e=>e.preventDefault());
storyDrop?.addEventListener('drop',async e=>{e.preventDefault();await setSource(e.dataTransfer.files?.[0])});

function storyboardInstruction(){
  const duration=flowDurationEl?.value||'8';
  const is8=duration==='8';
  const timeline=is8
    ? `Create SIX DISTINCT SHOTS inside ONE ${duration}-second video. This is a shot-based commercial, NOT one continuous camera take. Use clear visual transitions/hard cuts so all 6 shots are actually perceptible: SHOT 1 00:00-00:01.33 — opening hook; SHOT 2 00:01.33-00:02.67 — clear product reveal; SHOT 3 00:02.67-00:04.00 — visible use/demo ONLY IF directly supported by the reference, otherwise a feature/detail reveal; SHOT 4 00:04.00-00:05.33 — explain/show one clearly visible feature or marking; SHOT 5 00:05.33-00:06.67 — macro detail/material/texture reveal; SHOT 6 00:06.67-00:08.00 — final hero shot. Each shot must have a distinct framing, camera action, or visual purpose. Do not merge the six shots into one orbit or one uninterrupted rotation. The six shots must all be visibly represented within the full ${duration} seconds.`
    : `Create SIX DISTINCT SHOTS inside ONE ${duration}-second video. This is a shot-based commercial, not one continuous camera take. Use clear visual transitions/hard cuts so all 6 shots are perceptible: SHOT 1 00:00-00:02 — opening hook; SHOT 2 00:02-00:04 — product reveal; SHOT 3 00:04-00:06 — visible use/demo ONLY IF directly supported, otherwise feature/detail reveal; SHOT 4 00:06-00:08 — visible feature/marking; SHOT 5 00:08-00:10 — macro detail; SHOT 6 00:10-00:12 — final hero shot. Each shot must have a distinct framing, camera action, or visual purpose.`;
return `Analyze ONLY the single product screenshot attached to this request. This instruction is a GENERAL PRODUCTION RULE for ANY future product screenshot, not a template for one example product. Never assume the product is a lighter, electronics accessory, pump, beauty item, food item, tool, or any other specific category unless the current reference image clearly shows that category.

Console 2 does NOT create, edit, or download images. Your ONLY task is to produce ONE MASTER PROMPT TEXT that the user can paste directly into Google Flow.

Google Flow will receive the SAME CURRENT screenshot as its reference image. The master prompt must tell Google Flow how to turn that current reference into one clean, realistic, cinematic product advertisement in native vertical 9:16 with TOTAL duration exactly ${duration} SECONDS.

REFERENCE-GROUNDED ANALYSIS — DO THIS BEFORE WRITING THE MASTER PROMPT:
1. Identify what product/category is actually visible in the CURRENT screenshot.
2. Separate clearly visible facts from uncertain or hidden details.
3. Treat the CURRENT screenshot as the only source of truth for product identity. Do not use knowledge of similar products, remembered examples, brand catalogs, or assumptions from previous requests.
4. Identify only features that are visibly present or reliably identifiable from the CURRENT screenshot: shape, proportions, colors, printed markings/branding, materials, textures, controls, connectors, openings, accessories, and other physical details.
5. If a feature is ambiguous, partially hidden, too small to read, or not visible, DO NOT turn it into a factual claim.
6. Never invent internal components, hidden mechanisms, accessories, colors, materials, functions, specifications, dimensions, or use cases.
7. Before finalizing, mentally audit every specific noun and every claimed product feature in the master prompt against the CURRENT screenshot. Remove anything that is not supported by the CURRENT screenshot.

VIDEO STRUCTURE:
${timeline}

SCENE SAFETY RULE:
Do NOT force a usage demonstration. If the screenshot does not clearly support how the product is used, do not invent another device, a person's hands, a hidden mechanism, an attachment, a flame, liquid, food, charging action, opening/closing mechanism, or any other interaction. Replace the unsupported action with controlled camera movement, lighting, rotation, texture/detail reveal, or a close-up of visible product features.

GOOGLE FLOW INSTRUCTIONS TO INCLUDE:
- Use the CURRENT reference screenshot as the sole identity reference from first frame to last frame.
- Clean the source screenshot by removing marketplace UI, status bars, price, ratings, seller information, shopping buttons, menus, notifications, unrelated overlay graphics, and marketplace watermarks.
- Preserve the actual product identity. Do not redesign, replace, merge, duplicate, or morph the product.
- Preserve only the physical characteristics supported by the CURRENT screenshot.
- If the source background is unsuitable, create a clean realistic background while keeping the product unchanged.
- No random text, generated branding, extra logos, watermarks, or visual artifacts.
- Use realistic commercial lighting, reflections, depth of field, and physically plausible camera movement.
- Prefer controlled push-in, pan, tilt, partial orbit, rack focus, macro close-up, gentle rotation, or pull-back. Avoid aggressive 360-degree or extreme camera movement that can cause identity drift.
- Maintain product identity and visual continuity between shots, but DO NOT make the six shots look like one uninterrupted camera move. Each shot must be a visibly separate commercial beat.
- Do not make unsupported functional, technical, safety, performance, or material claims.\n- The sequence must visually communicate what the product is and what can be verified about it; do not spend the whole video merely rotating the object.\n- Shots 2–5 must deliberately reveal different visible product information rather than repeating the same orbit.
- If a detail cannot be verified from the CURRENT screenshot, omit it rather than guess.
- Avoid unsupported “benefit” language; show a visible feature instead.
- Do not add a second product or unrelated object merely to create a demonstration.
- Keep the same product scale, proportions, color identity, and visible markings throughout the sequence.
- Native vertical 9:16.
- Total duration exactly ${duration} seconds. Follow the selected duration; do not claim 12 seconds when the selected platform mode is 8 seconds.
- Style: realistic, premium, clean commercial product advertisement, cinematic lighting, sharp product detail, stable product identity.
- Do not use “8K” as a requirement; prioritize photorealism, detail, continuity, and fidelity to the reference.

OUTPUT RULE:
Return ONLY ONE MASTER PROMPT in English. Do not return analysis, notes, JSON, tables, explanations, alternative prompts, or images. The master prompt itself must contain the complete 6-shot timeline matching the selected duration, the reference-grounded product description, screenshot-cleanup instructions, continuity rules, camera movement, and 9:16/12-second specifications.

FINAL SELF-CHECK BEFORE OUTPUT:
Ask internally: “Could every specific product feature and every physical interaction in this prompt be verified from the CURRENT screenshot?” If not, delete or neutralize that detail. The prompt must be reusable for completely different product screenshots and must never be biased toward any example product.`;
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

async function callGemini(key){
  const base64=sourceDataUrl.split(',')[1];
  const mime=sourceDataUrl.slice(5,sourceDataUrl.indexOf(';'));

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
              {type:'image',mime_type:mime,data:base64},
              {type:'text',text:storyboardInstruction()}
            ],
            generation_config:{max_output_tokens:4096}
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
      if([400,401,403,404].includes(res.status))throw Error(msg);

      if([429,500,502,503,504].includes(res.status)){
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
  const d=flowDurationEl?.value||'8'; sheet.innerHTML='<div class="story-title">MASTER PROMPT — GOOGLE FLOW</div><div class="story-format">9:16 · 6 SCENE · '+d+' DETIK</div><pre class="master-prompt">'+esc(masterPrompt)+'</pre>';
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
    setStoryStatus('✓ Master Prompt 6 scene · durasi sesuai mode Google Flow siap di-copy.');
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
