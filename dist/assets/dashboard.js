const body=document.body;
const expectedRole=body.dataset.portalRole;
const menuToggle=document.querySelector('.menu-toggle');
const closeTargets=document.querySelectorAll('[data-close-menu]');
const navLinks=[...document.querySelectorAll('[data-view-link]')];
const views=[...document.querySelectorAll('[data-view]')];
const errorPanel=document.querySelector('.dashboard-error');
const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const state={events:[],partners:[],profile:null,logoData:null,year:new Date().getFullYear()};

const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const dateFrom=value=>new Date(`${String(value).slice(0,10)}T12:00:00`);
const shortDate=value=>dateFrom(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');
const fullDate=value=>dateFrom(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});

function closeMenu(){body.classList.remove('menu-open');menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label','Abrir menu')}
menuToggle.addEventListener('click',()=>{const open=body.classList.toggle('menu-open');menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Fechar menu':'Abrir menu')});
closeTargets.forEach(item=>item.addEventListener('click',closeMenu));

function showView(id,updateHash=true){
  const target=views.find(view=>view.id===id)||views[0];
  views.forEach(view=>view.hidden=view!==target);
  navLinks.forEach(link=>{const active=link.getAttribute('href')===`#${target.id}`;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});
  const title=document.querySelector('[data-page-title]');if(title)title.textContent=navLinks.find(link=>link.classList.contains('active'))?.textContent.replace(/^\d+\s*/,'').trim()||'Painel';
  if(updateHash)history.replaceState(null,'',`#${target.id}`);
  closeMenu();scrollTo({top:0,behavior:'smooth'});
}
navLinks.forEach(link=>link.addEventListener('click',event=>{event.preventDefault();showView(link.hash.slice(1))}));
document.querySelectorAll('[data-go-view]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.goView)));

function initials(name){return String(name||'AF').split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()}
function setLogo(preview,logo,name){preview.innerHTML=logo?`<img src="${logo}" alt="Logo de ${escapeHtml(name)}">`:`<span>${escapeHtml(initials(name))}</span>`}
async function normalizeLogo(file){
  const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  let result;
  for(const size of [600,480,360]){
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const context=canvas.getContext('2d');context.clearRect(0,0,size,size);
    const padding=Math.round(size*.07);const scale=Math.min((size-padding*2)/bitmap.width,(size-padding*2)/bitmap.height);
    const width=Math.round(bitmap.width*scale);const height=Math.round(bitmap.height*scale);
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(bitmap,(size-width)/2,(size-height)/2,width,height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.88));
    result=blob;if(blob.size<=500*1024)break;
  }
  bitmap.close();
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(result)});
}

function renderUpcoming(){
  const today=new Date().toISOString().slice(0,10);
  const upcoming=state.events.filter(event=>event.endDate>=today).slice(0,4);
  document.querySelectorAll('[data-upcoming-events]').forEach(container=>{container.innerHTML=upcoming.length?upcoming.map(event=>`<article class="compact-event"><time datetime="${escapeHtml(event.startDate)}">${dateFrom(event.startDate).getDate()}<small>${months[dateFrom(event.startDate).getMonth()].slice(0,3)}</small></time><div><h4>${escapeHtml(event.title)}</h4><p>${escapeHtml([event.timeLabel,event.location].filter(Boolean).join(' · ')||fullDate(event.startDate))}</p></div></article>`).join(''):'<div class="empty-inline">Nenhum evento publicado para os próximos dias.</div>'});
  const next=upcoming[0];document.querySelectorAll('[data-next-event]').forEach(item=>item.textContent=next?shortDate(next.startDate):'—');document.querySelectorAll('[data-next-event-title]').forEach(item=>item.textContent=next?.title||'Agenda aberta');
}

function prepareYearSelectors(){
  const years=new Set([new Date().getFullYear()-1,new Date().getFullYear(),new Date().getFullYear()+1,...state.events.map(event=>dateFrom(event.startDate).getFullYear())]);
  document.querySelectorAll('[data-year-select]').forEach(select=>{select.innerHTML=[...years].sort().map(year=>`<option value="${year}" ${year===state.year?'selected':''}>${year}</option>`).join('');select.onchange=()=>{state.year=Number(select.value);document.querySelectorAll('[data-year-select]').forEach(other=>other.value=String(state.year));renderCalendars()}});
}
function renderCalendars(){
  document.querySelectorAll('[data-calendar-year]').forEach(item=>item.textContent=String(state.year));
  document.querySelectorAll('[data-calendar]').forEach(calendar=>{calendar.innerHTML=months.map((month,index)=>{const events=state.events.filter(event=>dateFrom(event.startDate).getFullYear()===state.year&&dateFrom(event.startDate).getMonth()===index);return `<section class="calendar-month"><h4>${month}</h4>${events.length?events.map(event=>`<article class="month-event"><strong>${dateFrom(event.startDate).getDate()} · ${escapeHtml(event.title)}</strong><small>${escapeHtml([event.timeLabel,event.location].filter(Boolean).join(' · '))}</small></article>`).join(''):'<span class="month-empty">Sem programação</span>'}</section>`}).join('')});
}

function renderEventManagement(){
  const container=document.querySelector('[data-event-management]');if(!container)return;
  container.innerHTML=state.events.length?state.events.map(event=>`<article class="event-row"><time>${escapeHtml(shortDate(event.startDate))}</time><div><h4>${escapeHtml(event.title)}</h4><p>${escapeHtml([event.timeLabel,event.location,event.description].filter(Boolean).join(' · '))}</p></div><div class="event-row-actions"><button type="button" data-edit-event="${event.id}">Editar</button><button type="button" data-delete-event="${event.id}">Excluir</button></div></article>`).join(''):'<div class="empty-inline">A programação ainda não possui eventos.</div>';
}
function renderPartners(){
  document.querySelectorAll('[data-partner-count]').forEach(item=>item.textContent=String(state.partners.length));
  const grid=document.querySelector('[data-partners-grid]');if(!grid)return;
  grid.innerHTML=state.partners.length?state.partners.map(partner=>`<article class="portal-partner"><div class="portal-partner-logo">${partner.logoData?`<img src="${partner.logoData}" alt="Logo de ${escapeHtml(partner.companyName)}">`:`<span>${escapeHtml(initials(partner.companyName))}</span>`}</div><h3>${escapeHtml(partner.companyName)}</h3><p>${escapeHtml(partner.niche||'Nicho ainda não informado.')}</p></article>`).join(''):'<div class="empty-inline">Os parceiros cadastrados aparecerão aqui.</div>';
}
function renderData(){document.querySelectorAll('[data-event-count]').forEach(item=>item.textContent=String(state.events.length));renderUpcoming();prepareYearSelectors();renderCalendars();renderEventManagement();renderPartners()}

async function loadPublicData(){const response=await fetch('/api/public-data');if(!response.ok)throw new Error('Não foi possível carregar a agenda.');const data=await response.json();state.events=data.events||[];state.partners=data.partners||[];renderData()}

async function loadProfile(){
  const response=await fetch('/api/profile');if(!response.ok)throw new Error('Não foi possível carregar o perfil.');const {profile}=await response.json();state.profile=profile;
  document.querySelectorAll('.profile-form').forEach(form=>{form.elements.companyName.value=profile.company_name||'';form.elements.niche.value=profile.niche||'';setLogo(form.querySelector('[data-logo-preview]'),profile.logo_data,profile.company_name)});
  document.querySelectorAll('[data-company-greeting]').forEach(item=>item.textContent=profile.company_name||item.textContent);
  document.querySelectorAll('[data-profile-status]').forEach(item=>item.textContent=profile.logo_data&&profile.niche?'Completo':'Pendente');
}

async function loadTestimonial(){
  const form=document.querySelector('.testimonial-form');if(!form)return;
  const response=await fetch('/api/testimonial');if(!response.ok)throw new Error('Não foi possível carregar o depoimento.');
  const {testimonial}=await response.json();form.elements.content.value=testimonial.content||'';form.querySelector('[data-testimonial-count]').textContent=String(form.elements.content.value.length);
}

document.querySelectorAll('.profile-form').forEach(form=>{
  const fileInput=form.elements.logo;
  fileInput.addEventListener('change',async()=>{const file=fileInput.files[0];if(!file)return;const feedback=form.querySelector('.form-feedback');if(file.size>8*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){feedback.textContent='Escolha uma imagem PNG, JPG ou WebP de até 8 MB.';fileInput.value='';return}feedback.textContent='Ajustando largura e altura do logo…';try{state.logoData=await normalizeLogo(file);setLogo(form.querySelector('[data-logo-preview]'),state.logoData,form.elements.companyName.value);feedback.textContent='Logo ajustado para o formato quadrado.'}catch{feedback.textContent='Não foi possível processar esta imagem.';fileInput.value=''}});
  form.addEventListener('submit',async event=>{event.preventDefault();const feedback=form.querySelector('.form-feedback');const button=form.querySelector('.primary-action');button.disabled=true;feedback.textContent='Salvando…';try{const response=await fetch('/api/profile',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({companyName:form.elements.companyName.value,niche:form.elements.niche.value,logoData:state.logoData})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||'Não foi possível salvar.');feedback.textContent=data.message;state.logoData=null;await Promise.all([loadProfile(),loadPublicData()])}catch(error){feedback.textContent=error.message}finally{button.disabled=false}});
});

const testimonialForm=document.querySelector('.testimonial-form');
if(testimonialForm){
  const textarea=testimonialForm.elements.content;const count=testimonialForm.querySelector('[data-testimonial-count]');textarea.addEventListener('input',()=>count.textContent=String(textarea.value.length));
  testimonialForm.addEventListener('submit',async event=>{event.preventDefault();const button=testimonialForm.querySelector('.primary-action');const feedback=testimonialForm.querySelector('.form-feedback');button.disabled=true;feedback.textContent='Publicando…';try{const response=await fetch('/api/testimonial',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({content:textarea.value})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||'Não foi possível publicar.');feedback.textContent=data.message}catch(error){feedback.textContent=error.message}finally{button.disabled=false}});
}

const eventForm=document.querySelector('.event-form');
function resetEventForm(){if(!eventForm)return;eventForm.reset();eventForm.elements.id.value='';eventForm.querySelector('[data-event-form-title]').textContent='Novo evento';eventForm.querySelector('[data-cancel-edit]').hidden=true;eventForm.querySelector('.primary-action').textContent='Salvar evento'}
if(eventForm){
  eventForm.querySelector('[data-cancel-edit]').addEventListener('click',resetEventForm);
  eventForm.addEventListener('submit',async event=>{event.preventDefault();const feedback=eventForm.querySelector('.form-feedback');const button=eventForm.querySelector('.primary-action');button.disabled=true;feedback.textContent='Salvando…';const payload=Object.fromEntries(new FormData(eventForm));try{const response=await fetch('/api/events',{method:payload.id?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||'Não foi possível salvar o evento.');feedback.textContent='Evento publicado na programação.';resetEventForm();await loadPublicData()}catch(error){feedback.textContent=error.message}finally{button.disabled=false}});
  document.querySelector('[data-event-management]').addEventListener('click',async event=>{const editId=event.target.dataset.editEvent;const deleteId=event.target.dataset.deleteEvent;if(editId){const item=state.events.find(entry=>entry.id===editId);if(!item)return;Object.entries({id:item.id,title:item.title,startDate:item.startDate,endDate:item.endDate,timeLabel:item.timeLabel,location:item.location,description:item.description}).forEach(([key,value])=>eventForm.elements[key].value=value||'');eventForm.querySelector('[data-event-form-title]').textContent='Editar evento';eventForm.querySelector('[data-cancel-edit]').hidden=false;eventForm.querySelector('.primary-action').textContent='Atualizar evento';eventForm.scrollIntoView({behavior:'smooth'})}if(deleteId&&confirm('Excluir este evento da programação?')){const response=await fetch('/api/events',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id:deleteId})});if(response.ok)await loadPublicData()}});
}

document.querySelector('.logout-button').addEventListener('click',async()=>{await fetch('/api/logout',{method:'POST'}).catch(()=>{});location.replace('/')});

async function start(){
  try{
    const response=await fetch('/api/session',{headers:{accept:'application/json'}});if(response.status===401){location.replace('/?login=1');return}if(!response.ok)throw new Error('O serviço de autenticação está indisponível.');
    const {user}=await response.json();if(expectedRole==='admin'&&user.role!=='admin'){location.replace('/partner.html');return}if(expectedRole==='partner'&&user.role==='admin'){location.replace('/dashboard.html');return}
    document.querySelector('[data-user-name]').textContent=user.login;document.querySelector('[data-user-role]').textContent=user.role==='admin'?'Administrador':'Parceiro';document.querySelectorAll('[data-user-greeting]').forEach(item=>item.textContent=user.login);
    await Promise.all([loadPublicData(),loadProfile(),loadTestimonial()]);body.classList.remove('dashboard-loading');showView(location.hash.slice(1)||'inicio',false);
  }catch(error){body.classList.remove('dashboard-loading');errorPanel.hidden=false;errorPanel.querySelector('span').textContent=error.message}
}
start();
