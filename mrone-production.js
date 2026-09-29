const MRONE_KEY='mrone-production-foundation-v1';
const STATES=['DRAFT','RESEARCHING','READY','PRODUCING','REVIEW','APPROVED','QUEUED','PUBLISHED','MONITORED','ARCHIVED'];
const NEXT={DRAFT:'RESEARCHING',RESEARCHING:'READY',READY:'PRODUCING',PRODUCING:'REVIEW',REVIEW:'APPROVED',APPROVED:'QUEUED',QUEUED:'PUBLISHED',PUBLISHED:'MONITORED',MONITORED:'ARCHIVED'};
const DEFAULT={jobs:[],candidates:[],events:[],config:{manufactEndpoint:'',cloudinaryCloudName:'',bufferEndpoint:''}};
let mr=loadMR(); let mrTab='home';
const q=s=>document.querySelector(s);
function loadMR(){try{return {...DEFAULT,...JSON.parse(localStorage.getItem(MRONE_KEY)||'{}')}}catch(e){return structuredClone(DEFAULT)}}
function saveMR(){localStorage.setItem(MRONE_KEY,JSON.stringify(mr))}
function audit(job,event,meta=''){mr.events.unshift({id:'AUD-'+Date.now(),job,event,actor:'MR.ONE',time:new Date().toISOString(),meta});saveMR()}
function esc(v=''){return String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function id(prefix,n){return prefix+'-'+String(n).padStart(4,'0')}
function createCandidate(){const x={id:id('CAND',mr.candidates.length+1),title:'New Discovery Opportunity',source:'USER_INPUT',url:'',evidence:'',status:'DRAFT',notes:''};mr.candidates.unshift(x);saveMR();audit(x.id,'DISCOVERY_CREATED');renderMR()}
function createJob(candidateId=''){const x={id:id('JOB',mr.jobs.length+1),title:'New Production Job',state:'DRAFT',priority:'NORMAL',candidateId};mr.jobs.unshift(x);saveMR();audit(x.id,'JOB_CREATED');renderMR()}
function transition(){const j=mr.jobs[0];if(!j)return;const next=NEXT[j.state];if(!next)return;j.state=next;saveMR();audit(j.id,'STATE_'+next);renderMR()}
function handoff(){const c=mr.candidates[0];if(!c)return;c.status='READY_FOR_RESEARCH';saveMR();audit(c.id,'DISCOVERY_HANDOFF_TO_RESEARCH');renderMR()}
function statusFor(v){return v?'CONFIGURED':'NOT CONFIGURED'}
function renderMR(){
 const root=q('#mroneFoundation'); if(!root)return;
 const j=mr.jobs[0],c=mr.candidates[0],next=j?NEXT[j.state]:null;
 root.innerHTML=`
 <section class="mrone-shell">
  <div class="mrone-head"><div><p class="eyebrow">MR.ONE · PRODUCTION FOUNDATION</p><h2>Discovery → Home → Production</h2><p class="sub">Foundation copied from MR.ONE Production Engine and adapted into this 9:16 repository.</p></div><span class="mrone-badge">LOCAL STATE · FREE-FIRST</span></div>
  <div class="mrone-architecture">
   <div class="arch-node active"><b>🔎 MR.ONE DISCOVERY</b><small>peluang / screenshot / link</small></div><div class="arch-arrow">↓</div>
   <div class="arch-node active"><b>🧠 MR.ONE HOME</b><small>orchestrator · Job ID · state · approval</small></div><div class="arch-arrow">↓</div>
   <div class="arch-node"><b>🖥️ GITHUB PAGES</b><small>frontend / app UI</small></div>
   <div class="arch-split"><span>↙</span><span>↘</span></div>
   <div class="arch-branches"><div class="arch-node"><b>⚙️ MANUFACT</b><small>backend / MCP endpoint</small><em>${statusFor(mr.config.manufactEndpoint)}</em></div><div class="arch-node"><b>📁 CLOUDINARY</b><small>media storage</small><em>${statusFor(mr.config.cloudinaryCloudName)}</em></div></div>
   <div class="arch-arrow">↓</div><div class="arch-node"><b>🔄 BUFFER</b><small>queue / temporary processing</small><em>${statusFor(mr.config.bufferEndpoint)}</em></div><div class="arch-arrow">↓</div>
   <div class="arch-node active"><b>📦 PRODUCT / OUTPUT</b><small>creative asset · publish-ready result</small></div>
  </div>
  <div class="mrone-tabs">${[['home','Home'],['discovery','Discovery'],['job','Job / Workflow'],['control','Control Plane']].map(([k,l])=>`<button class="${mrTab===k?'active':''}" data-mrtab="${k}">${l}</button>`).join('')}</div>
  <div class="mrone-body">${mrTab==='home'?homeView(j,c,next):mrTab==='discovery'?discoveryView(c):mrTab==='job'?jobView(j,next):controlView()}</div>
 </section>`;
 root.querySelectorAll('[data-mrtab]').forEach(b=>b.onclick=()=>{mrTab=b.dataset.mrtab;renderMR()});
}
function homeView(j,c,next){return `
 <div class="mrone-grid">
  <div class="mr-card"><div class="mr-card-head"><h3>Control Center</h3><button class="mr-primary" id="mrNewJob">+ Job</button></div><div class="mr-metrics"><span>Jobs <b>${mr.jobs.length}</b></span><span>Discovery <b>${mr.candidates.length}</b></span><span>Audit <b>${mr.events.length}</b></span></div>${j?`<div class="mr-record"><b>${esc(j.id)}</b><span>${esc(j.title)}</span><em>${j.state}</em></div><div class="mr-state-line">${STATES.map(s=>`<span class="${s===j.state?'current':''}">${s}</span>`).join('')}</div>${next?`<button class="mr-primary" id="mrTransition">Transition → ${next}</button>`:''}`: '<p class="muted">Belum ada Job. Discovery atau buat Job untuk memulai.</p>'}</div>
  <div class="mr-card"><div class="mr-card-head"><h3>Foundation Contracts</h3><span>Production Engine</span></div>
   <div class="mr-check">✓ Job ID + Workflow State</div><div class="mr-check">✓ Approval Gateway</div><div class="mr-check">✓ Registry / Adapter boundaries</div><div class="mr-check">✓ Audit / History</div><div class="mr-check">✓ Provider-neutral architecture</div><div class="mr-check">✓ No secrets committed</div>
  </div>
 </div>
 <div class="mr-card"><div class="mr-card-head"><h3>Current Flow</h3><span>Connected to this repository</span></div><div class="mr-flow"><span>Discovery</span><b>→</b><span>Home</span><b>→</b><span>Creative</span><b>→</b><span>Buffer</span><b>→</b><span>Output</span></div></div>`;
}
function discoveryView(c){return `
 <div class="mr-card"><div class="mr-card-head"><h3>Opportunity Discovery</h3><button class="mr-primary" id="mrNewCandidate">+ Candidate</button></div>
 ${c?`<label>Title<input id="mrCTitle" value="${esc(c.title)}"></label><label>Source URL<input id="mrCUrl" value="${esc(c.url)}" placeholder="https://..."></label><label>Evidence<textarea id="mrCEvidence">${esc(c.evidence)}</textarea></label><label>Notes<textarea id="mrCNotes">${esc(c.notes)}</textarea></label><div class="mr-actions"><button id="mrSaveCandidate">Save</button><button id="mrHandoff" class="mr-primary">Handoff → Research</button></div><div class="mr-record"><b>${c.id}</b><span>${c.status}</span><em>DISCOVERY</em></div>`: '<p class="muted">Belum ada candidate.</p>'}</div>`}
function jobView(j,next){return `
 <div class="mr-card"><div class="mr-card-head"><h3>Job Registry / Workflow</h3><span>Controlled transitions</span></div>${j?`<div class="mr-record"><b>${j.id}</b><span>${esc(j.title)}</span><em>${j.state}</em></div><div class="mr-state-line large">${STATES.map(s=>`<span class="${s===j.state?'current':''}">${s}</span>`).join('')}</div><p class="muted">External consequential actions remain blocked until explicit approval.</p>${next?`<button id="mrTransition2" class="mr-primary">Transition → ${next}</button>`: '<b>Terminal state</b>'}`: '<p class="muted">No Job.</p>'}</div>`}
function controlView(){return `
 <div class="mr-grid3"><div class="mr-card"><h3>Manufact</h3><p class="muted">Backend / MCP hosting endpoint.</p><input id="mrManufact" value="${esc(mr.config.manufactEndpoint)}" placeholder="Production MCP URL"><small>Current: ${statusFor(mr.config.manufactEndpoint)}</small></div><div class="mr-card"><h3>Cloudinary</h3><p class="muted">Media storage only; not the backend.</p><input id="mrCloudinary" value="${esc(mr.config.cloudinaryCloudName)}" placeholder="Cloud name"><small>Current: ${statusFor(mr.config.cloudinaryCloudName)}</small></div><div class="mr-card"><h3>Buffer</h3><p class="muted">Queue / temporary processing adapter.</p><input id="mrBuffer" value="${esc(mr.config.bufferEndpoint)}" placeholder="Buffer endpoint"><small>Current: ${statusFor(mr.config.bufferEndpoint)}</small></div></div>
 <div class="mr-card"><div class="mr-card-head"><h3>Approval Gateway</h3><span>ENABLED</span></div><p class="muted">No external publishing action is executed by this foundation. Provider adapters are configuration boundaries only.</p><button id="mrSaveConfig" class="mr-primary">Save Configuration</button></div>
 <div class="mr-card"><div class="mr-card-head"><h3>Audit / History</h3><span>${mr.events.length} events</span></div>${mr.events.slice(0,8).map(e=>`<div class="mr-audit"><b>${e.event}</b><span>${e.job}</span><small>${e.time}</small></div>`).join('')||'<p class="muted">No events.</p>'}</div>`}
document.addEventListener('click',e=>{
 if(e.target.id==='mrNewJob')createJob();
 if(e.target.id==='mrNewCandidate')createCandidate();
 if(e.target.id==='mrTransition'||e.target.id==='mrTransition2')transition();
 if(e.target.id==='mrHandoff')handoff();
 if(e.target.id==='mrSaveCandidate'){const c=mr.candidates[0];if(c){c.title=q('#mrCTitle').value;c.url=q('#mrCUrl').value;c.evidence=q('#mrCEvidence').value;c.notes=q('#mrCNotes').value;c.status='SAVED';saveMR();audit(c.id,'DISCOVERY_SAVED');renderMR()}}
 if(e.target.id==='mrSaveConfig'){mr.config.manufactEndpoint=q('#mrManufact').value.trim();mr.config.cloudinaryCloudName=q('#mrCloudinary').value.trim();mr.config.bufferEndpoint=q('#mrBuffer').value.trim();saveMR();audit('SYSTEM','CONFIGURATION_UPDATED');renderMR()}
});
renderMR();