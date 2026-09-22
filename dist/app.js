const groups={
  estado:['Estável','Apresenta melhora','Requer cuidados e acompanhamento','Estado delicado'],
  agua:['Bebeu normalmente','Bebeu pouco','Não bebeu espontaneamente'],
  fezes:['Sim','Normal','Não','Amolecido','Em observação','Diarreia'],
  comportamento:['Alerta/ativo','Tranquilo','Carinhoso/receptivo','Assustado/estressado','Sonolento','Em observação'],
  apetite:['Normal','Comeu pouco','Não quis comer'],
  alimentacao:['Ração seca','Ração úmida/pastosa','Dieta especial','Alimentação assistida'],
  urina:['Sim','Não','Em observação'],
  medicacao:['Medicações realizadas conforme prescrição'],
  frequencia:['1x ao dia','2x ao dia','3x ao dia','4x ao dia']
};
const form=document.querySelector('#bulletin'),toast=document.querySelector('#toast'),statusEl=document.querySelector('#saveStatus');
const HISTORY_KEY='onda-boletins-history';
let currentRecordId=null,currentResponsible='';
for(const [group,items] of Object.entries(groups)){
  const root=document.querySelector(`[data-group="${group}"]`);
  items.forEach((label,i)=>{root.insertAdjacentHTML('beforeend',`<label class="check-label"><input type="checkbox" name="${group}_${i}"><span>${label}</span></label>`)});
}
const state={species:'canina',shift:'manha'};
const showToast=(message)=>{toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),2600)};
function syncHeader(){
  const feline=state.species==='felina';
  document.querySelector('[data-species-title]').textContent=feline?'FELINA':'CANINA';
  document.querySelectorAll('[data-animal-icon]').forEach(x=>x.textContent=feline?'🐱':'🐶');
  const img=document.querySelector('#petImage'); img.src=feline?'pet-felino.png':'pet-canino.png';
  document.querySelectorAll('[data-mirror-shift]').forEach(x=>x.checked=x.dataset.mirrorShift===state.shift);
}
function serialize(){const data=Object.fromEntries(new FormData(form));form.querySelectorAll('input[type=checkbox]').forEach(x=>data[x.name]=x.checked);return{recordId:currentRecordId,responsavel:currentResponsible,species:state.species,shift:state.shift,data,updatedAt:new Date().toISOString()}}
function apply(saved){
  if(!saved)return; state.species=saved.species||'canina';state.shift=saved.shift||'manha';
  currentRecordId=saved.recordId||saved.id||null;currentResponsible=saved.responsavel||saved.data?.responsavel||'';
  document.querySelector(`input[name=species][value=${state.species}]`).checked=true;document.querySelector(`input[name=shift][value=${state.shift}]`).checked=true;
  for(const [name,value] of Object.entries(saved.data||{})){const el=form.elements[name];if(!el)continue;if(el.type==='checkbox')el.checked=value===true||value==='true';else el.value=value}
  syncHeader();document.querySelector('#saveBtn').textContent=currentRecordId?'Atualizar boletim':'Salvar boletim';
}
function saveDraft(){localStorage.setItem('onda-boletim-draft',JSON.stringify(serialize()));statusEl.innerHTML='<span></span> Alterações salvas'}
function getHistory(){try{const value=JSON.parse(localStorage.getItem(HISTORY_KEY));return Array.isArray(value)?value:[]}catch{return[]}}
function setHistory(items){localStorage.setItem(HISTORY_KEY,JSON.stringify(items.slice(0,60)))}
async function syncBulletin(snapshot){
  const response=await fetch('/api/bulletins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'Não foi possível sincronizar com a gerência');
  return result;
}
function safe(value=''){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
function formatDate(value){if(!value)return'Sem data';const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?value:date.toLocaleDateString('pt-BR')}
let responsibleResolver=null;
function askResponsible(){
  const dialog=document.querySelector('#responsibleDialog'),input=document.querySelector('#responsibleInput');input.value=currentResponsible;dialog.returnValue='';dialog.showModal();setTimeout(()=>{input.focus();input.select()},50);
  return new Promise(resolve=>{responsibleResolver=resolve});
}
document.querySelector('#responsibleDialog').addEventListener('close',event=>{if(!responsibleResolver)return;const confirmed=event.target.returnValue==='confirm',value=confirmed?document.querySelector('#responsibleInput').value.trim():'';const resolve=responsibleResolver;responsibleResolver=null;resolve(value||null)});
function renderHistory(query=document.querySelector('#historySearch').value){
  const all=getHistory().sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  const term=query.trim().toLocaleLowerCase('pt-BR');
  const items=all.filter(item=>!term||`${item.data?.paciente||''} ${item.data?.tutor||''} ${item.data?.data||''}`.toLocaleLowerCase('pt-BR').includes(term));
  const list=document.querySelector('#historyList');document.querySelector('#historyCount').textContent=all.length;list.innerHTML='';
  if(!items.length){list.innerHTML=`<div class="history-empty">${term?'Nenhum boletim encontrado.':'Os boletins salvos aparecerão aqui.'}</div>`;return}
  items.forEach(item=>{
    const card=document.createElement('article');card.className=`history-card${item.id===currentRecordId?' active':''}`;
    card.innerHTML=`<button class="history-open" type="button" data-open="${safe(item.id)}"><span class="history-animal">${item.species==='felina'?'🐱':'🐶'}</span><span class="history-info"><strong>${safe(item.data?.paciente||'Animal sem nome')}</strong><small>${safe(item.data?.tutor||'Tutor não informado')}</small><span class="history-responsible">👤 ${safe(item.responsavel||item.data?.responsavel||'Responsável não informado')}</span><em>${formatDate(item.data?.data)} • ${item.shift==='manha'?'Manhã':'Tarde/noite'}</em></span></button><button class="history-delete" type="button" data-delete="${safe(item.id)}" aria-label="Excluir boletim de ${safe(item.data?.paciente||'paciente')}">×</button>`;
    list.appendChild(card);
  });
}
async function saveBulletin(silent=false,responsibleOverride=''){
  const paciente=form.elements.paciente.value.trim(),tutor=form.elements.tutor.value.trim();
  if(!paciente){showToast('Informe o nome do animal');form.elements.paciente.focus();return false}
  if(!tutor){showToast('Informe o nome do tutor');form.elements.tutor.focus();return false}
  const responsible=responsibleOverride.trim()||await askResponsible();if(!responsible)return false;currentResponsible=responsible;
  const items=getHistory(),existing=items.find(item=>item.id===currentRecordId);currentRecordId=currentRecordId||(crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const snapshot={...serialize(),id:currentRecordId,recordId:currentRecordId,responsavel:currentResponsible,createdAt:existing?.createdAt||new Date().toISOString()};
  setHistory([snapshot,...items.filter(item=>item.id!==currentRecordId)]);saveDraft();renderHistory();
  let synchronized=true;try{await syncBulletin(snapshot)}catch(error){console.error(error);synchronized=false}
  document.querySelector('#saveBtn').textContent='Atualizar boletim';
  if(!silent)showToast(synchronized?(existing?'Boletim atualizado e sincronizado':'Boletim salvo para a gerência'):'Salvo neste computador, mas sem sincronizar');
  return true;
}
function newBulletin(ask=true){
  if(ask&&(form.elements.paciente.value||form.elements.tutor.value)&&!confirm('Começar um novo boletim? O boletim atual continua salvo no histórico.'))return;
  form.reset();currentRecordId=null;currentResponsible='';state.species='canina';state.shift='manha';document.querySelector('input[name=species][value=canina]').checked=true;document.querySelector('input[name=shift][value=manha]').checked=true;form.elements.data.value=new Date().toISOString().slice(0,10);syncHeader();localStorage.removeItem('onda-boletim-draft');document.querySelector('#saveBtn').textContent='Salvar boletim';document.querySelector('.eyebrow').textContent='NOVO BOLETIM';renderHistory();showToast('Novo boletim iniciado');
}
let saveTimer;form.addEventListener('input',()=>{statusEl.innerHTML='<span style="background:#e4a73a"></span> Salvando rascunho…';clearTimeout(saveTimer);saveTimer=setTimeout(saveDraft,700)});
document.querySelectorAll('input[name=species]').forEach(el=>el.addEventListener('change',()=>{state.species=el.value;syncHeader();saveDraft()}));
document.querySelectorAll('input[name=shift]').forEach(el=>el.addEventListener('change',()=>{state.shift=el.value;syncHeader();saveDraft()}));
document.querySelectorAll('[data-mirror-shift]').forEach(el=>el.addEventListener('change',()=>{state.shift=el.dataset.mirrorShift;document.querySelector(`input[name=shift][value=${state.shift}]`).checked=true;syncHeader();saveDraft()}));
document.querySelector('#saveBtn').addEventListener('click',()=>saveBulletin(false));document.querySelector('#pdfBtn').addEventListener('click',async()=>{if(await saveBulletin(true))window.print()});
document.querySelector('#clearBtn').addEventListener('click',()=>newBulletin(true));
document.querySelector('#historySearch').addEventListener('input',event=>renderHistory(event.target.value));
document.querySelector('#reportBtn').addEventListener('click',()=>{
  const items=getHistory().sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));if(!items.length){showToast('Ainda não há boletins no histórico');return}
  const quote=value=>`"${String(value??'').replace(/"/g,'""')}"`;
  const rows=[['Data do boletim','Horário','Animal','Tutor','Espécie','Período','Veterinário','Responsável pelo boletim','Salvo em'],...items.map(item=>[formatDate(item.data?.data),item.data?.horario||'',item.data?.paciente||'',item.data?.tutor||'',item.species==='felina'?'Felina':'Canina',item.shift==='manha'?'Manhã':'Tarde/noite',item.data?.veterinario||'',item.responsavel||item.data?.responsavel||'',new Date(item.updatedAt).toLocaleString('pt-BR')])];
  const csv='\ufeff'+rows.map(row=>row.map(quote).join(';')).join('\r\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`relatorio-boletins-${new Date().toISOString().slice(0,10)}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('Relatório baixado');
});
document.querySelector('#historyList').addEventListener('click',event=>{
  const open=event.target.closest('[data-open]'),remove=event.target.closest('[data-delete]');
  if(open){const item=getHistory().find(entry=>entry.id===open.dataset.open);if(item){form.reset();apply(item);saveDraft();document.querySelector('.eyebrow').textContent='EDITANDO BOLETIM';renderHistory();if(innerWidth<1050)document.querySelector('.preview-shell').scrollIntoView({behavior:'smooth'});showToast(`Boletim de ${item.data?.paciente||'paciente'} aberto`)}}
  if(remove){const item=getHistory().find(entry=>entry.id===remove.dataset.delete);if(item&&confirm(`Excluir o boletim de ${item.data?.paciente||'paciente'}?`)){setHistory(getHistory().filter(entry=>entry.id!==item.id));if(currentRecordId===item.id)newBulletin(false);renderHistory();showToast('Boletim excluído')}}
});

async function sheetPng(){
  const node=document.querySelector('.sheet');
  if(typeof html2canvas!=='function')throw new Error('Gerador de imagem indisponível');
  const previousTransform=node.style.transform,previousMargin=node.style.marginBottom;
  node.style.transform='none';node.style.marginBottom='0';
  try{
    const canvas=await html2canvas(node,{scale:2,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,width:794,height:1123,windowWidth:1200,scrollX:0,scrollY:0});
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível criar a imagem')),'image/png',1));
  }finally{node.style.transform=previousTransform;node.style.marginBottom=previousMargin}
}
function filename(ext){const pet=(form.elements.paciente.value||'paciente').trim().replace(/[^a-z0-9à-ú]+/gi,'-');return`boletim-${state.species}-${pet}.${ext}`.toLowerCase()}
async function exportPng(download=true){if(!await saveBulletin(true))return null;try{showToast('Gerando imagem…');const blob=await sheetPng();if(download){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename('png');a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);showToast('Download da imagem iniciado')}return blob}catch(e){console.error(e);showToast('Não foi possível gerar a imagem. Tente novamente.');throw e}}
document.querySelector('#pngBtn').addEventListener('click',()=>exportPng(true));
document.querySelector('#shareBtn').addEventListener('click',async()=>{
  try{
    const blob=await exportPng(false);if(!blob)return;
    const pet=form.elements.paciente.value||'seu pet',message=`Olá! Segue o boletim de internação de ${pet}.`;
    const file=new File([blob],filename('png'),{type:'image/png'});
    if(navigator.canShare?.({files:[file]})){
      await navigator.share({title:'Boletim de internação',text:message,files:[file]});showToast('Boletim compartilhado');return;
    }
    const imageUrl=URL.createObjectURL(blob),download=document.createElement('a');download.href=imageUrl;download.download=filename('png');download.click();setTimeout(()=>URL.revokeObjectURL(imageUrl),1500);
    document.querySelector('#openWhatsapp').href=`https://wa.me/?text=${encodeURIComponent(`${message} A imagem está pronta para ser anexada.`)}`;
    document.querySelector('#shareDialog').showModal();
  }catch(e){if(e.name!=='AbortError'){console.error(e);showToast('Não foi possível abrir o compartilhamento')}}
});
document.querySelector('#closeShareDialog').addEventListener('click',()=>document.querySelector('#shareDialog').close());
document.querySelector('#openWhatsapp').addEventListener('click',()=>document.querySelector('#shareDialog').close());

try{apply(JSON.parse(localStorage.getItem('onda-boletim-draft')))}catch{syncHeader()}
if(!form.elements.data.value)form.elements.data.value=new Date().toISOString().slice(0,10);
renderHistory();
function fit(){if(innerWidth<=820){const shell=document.querySelector('.preview-shell'),sheet=document.querySelector('.sheet'),scale=Math.min(1,(shell.clientWidth-4)/794);sheet.style.transform=`scale(${scale})`;sheet.style.marginBottom=`${-(1123*(1-scale))}px`}else{document.querySelector('.sheet').style.transform='none';document.querySelector('.sheet').style.marginBottom='0'}}
addEventListener('resize',fit);fit();

// Permite que assistentes compatíveis preencham e salvem o mesmo formulário visível.
if(document.modelContext?.registerTool){
  const toolError=e=>console.warn('WebMCP indisponível',e);
  Promise.resolve(document.modelContext.registerTool({
    name:'fill_bulletin_patient',title:'Preencher paciente do boletim',
    description:'Preenche os dados principais visíveis de um boletim de internação felina ou canina.',
    inputSchema:{type:'object',properties:{species:{type:'string',enum:['canina','felina']},shift:{type:'string',enum:['manha','tarde']},paciente:{type:'string'},tutor:{type:'string'},veterinario:{type:'string'},data:{type:'string'},horario:{type:'string'}},required:['species','paciente'],additionalProperties:false},
    annotations:{readOnlyHint:false,untrustedContentHint:false},
    execute(input){if(!input||!['canina','felina'].includes(input.species)||typeof input.paciente!=='string'||!input.paciente.trim())throw new Error('Informe species e paciente válidos.');state.species=input.species;if(input.shift)state.shift=input.shift;for(const key of ['paciente','tutor','veterinario','data','horario'])if(typeof input[key]==='string'&&form.elements[key])form.elements[key].value=input[key];document.querySelector(`input[name=species][value=${state.species}]`).checked=true;document.querySelector(`input[name=shift][value=${state.shift}]`).checked=true;syncHeader();saveDraft();return{status:'preenchido',species:state.species,paciente:form.elements.paciente.value}}
  })).catch(toolError);
  Promise.resolve(document.modelContext.registerTool({
    name:'save_bulletin_history',title:'Salvar boletim',description:'Salva no histórico o boletim visível, registrando o responsável interno.',
    inputSchema:{type:'object',properties:{responsavel:{type:'string'}},required:['responsavel'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},
    async execute(input){const saved=await saveBulletin(false,input.responsavel||'');return{status:saved?'salvo':'não salvo',species:state.species,paciente:form.elements.paciente.value||null}}
  })).catch(toolError);
}
