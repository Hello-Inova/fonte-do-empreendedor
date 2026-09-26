const body=document.body;
const expectedRole=body.dataset.portalRole;
const menuToggle=document.querySelector('.menu-toggle');
const closeTargets=document.querySelectorAll('[data-close-menu]');
const navLinks=[...document.querySelectorAll('[data-view-link]')];
const views=[...document.querySelectorAll('[data-view]')];
const errorPanel=document.querySelector('.dashboard-error');
const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const weekDays=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const today=new Date();
const state={events:[],partners:[],adminPartners:[],profile:null,logoData:null,year:today.getFullYear(),month:today.getMonth(),registrations:[],registrationQuery:'',registrationEvent:'',eventFolderEnabled:true,eventAlertEnabled:true};

const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const dateFrom=value=>new Date(`${String(value).slice(0,10)}T12:00:00`);
const shortDate=value=>dateFrom(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');
const fullDate=value=>dateFrom(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
const safeExternalUrl=value=>{try{const url=new URL(String(value||''));return ['http:','https:'].includes(url.protocol)?url.toString():''}catch{return ''}};

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
function setLogo(preview,logo,name){preview.innerHTML=logo?`<img src="${logo}" alt="Logo de ${escapeHtml(name)}">`:`<span>${escapeHtml(initials(name))}</span>`;adaptPartnerLogos(preview)}
const normalizeLogo=file=>normalizePartnerLogo(file);

function renderUpcoming(){
  const today=new Date().toISOString().slice(0,10);
  const upcoming=state.events.filter(event=>event.endDate>=today).slice(0,4);
  document.querySelectorAll('[data-upcoming-events]').forEach(container=>{container.innerHTML=upcoming.length?upcoming.map(event=>`<article class="compact-event"><time datetime="${escapeHtml(event.startDate)}">${dateFrom(event.startDate).getDate()}<small>${months[dateFrom(event.startDate).getMonth()].slice(0,3)}</small></time><div><h4>${escapeHtml(event.title)}</h4><p>${escapeHtml([event.timeLabel,event.location].filter(Boolean).join(' · ')||fullDate(event.startDate))}</p></div></article>`).join(''):'<div class="empty-inline">Nenhum evento publicado para os próximos dias.</div>'});
  const next=upcoming[0];document.querySelectorAll('[data-next-event]').forEach(item=>item.textContent=next?shortDate(next.startDate):'—');document.querySelectorAll('[data-next-event-title]').forEach(item=>item.textContent=next?.title||'Agenda aberta');
  document.querySelectorAll('[data-next-register]').forEach(link=>{link.hidden=!next;if(next)link.href=`/inscricao.html?event=${encodeURIComponent(next.id)}&source=portal`});
  const eventAlert=document.querySelector('[data-portal-event-alert]');if(eventAlert){eventAlert.hidden=!next;document.querySelector('.dashboard-main').classList.toggle('has-event-alert',Boolean(next));if(next)eventAlert.querySelector('[data-portal-event-text]').textContent=`${next.title} — ${fullDate(next.startDate)}${next.timeLabel?` · ${next.timeLabel}`:''}`}
}

function prepareYearSelectors(){
  const years=new Set([new Date().getFullYear()-1,new Date().getFullYear(),new Date().getFullYear()+1,...state.events.map(event=>dateFrom(event.startDate).getFullYear())]);
  document.querySelectorAll('[data-year-select]').forEach(select=>{select.innerHTML=[...years].sort().map(year=>`<option value="${year}" ${year===state.year?'selected':''}>${year}</option>`).join('');select.onchange=()=>{state.year=Number(select.value);document.querySelectorAll('[data-year-select]').forEach(other=>other.value=String(state.year));renderCalendars()}});
}
function renderCalendars(){
  document.querySelectorAll('[data-calendar-year]').forEach(item=>item.textContent=`${months[state.month]} ${state.year}`);
  const firstDay=new Date(state.year,state.month,1).getDay();const totalDays=new Date(state.year,state.month+1,0).getDate();const cells=[];
  for(let empty=0;empty<firstDay;empty++)cells.push('<span class="portal-calendar-day is-empty" aria-hidden="true"></span>');
  for(let day=1;day<=totalDays;day++){
    const dateKey=`${state.year}-${String(state.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;const events=state.events.filter(event=>String(event.startDate).slice(0,10)===dateKey);
    cells.push(`<span class="portal-calendar-day${events.length?' has-event':''}"><b>${day}</b>${events.map(event=>`<span class="portal-day-event" title="${escapeHtml(event.title)}"><i></i>${escapeHtml(event.title)}</span>`).join('')}</span>`);
  }
  document.querySelectorAll('[data-calendar]').forEach(calendar=>{calendar.innerHTML=`<div class="portal-calendar-toolbar"><button type="button" data-portal-calendar-prev aria-label="Ver mês anterior">←</button><h4>${months[state.month]} <span>${state.year}</span></h4><button type="button" data-portal-calendar-next aria-label="Ver próximo mês">→</button></div><div class="portal-week-row">${weekDays.map(day=>`<span>${day}</span>`).join('')}</div><div class="portal-month-grid">${cells.join('')}</div>`;calendar.querySelector('[data-portal-calendar-prev]').onclick=()=>changeCalendarMonth(-1);calendar.querySelector('[data-portal-calendar-next]').onclick=()=>changeCalendarMonth(1)});
}
function changeCalendarMonth(delta){const target=new Date(state.year,state.month+delta,1);state.year=target.getFullYear();state.month=target.getMonth();document.querySelectorAll('[data-year-select]').forEach(select=>{if(![...select.options].some(option=>Number(option.value)===state.year))select.add(new Option(String(state.year),String(state.year)));select.value=String(state.year)});renderCalendars()}

function renderEventManagement(){
  const container=document.querySelector('[data-event-management]');if(!container)return;
  container.innerHTML=state.events.length?state.events.map(event=>`<article class="event-row"><time>${escapeHtml(shortDate(event.startDate))}</time><div><h4>${escapeHtml(event.title)}</h4><p>${escapeHtml([event.timeLabel,event.location,event.description].filter(Boolean).join(' · '))}</p></div><div class="event-row-actions"><button type="button" data-edit-event="${event.id}">Editar</button><button type="button" data-delete-event="${event.id}">Excluir</button></div></article>`).join(''):'<div class="empty-inline">A programação ainda não possui eventos.</div>';
}
function renderPartners(){
  const items=expectedRole==='admin'&&state.adminPartners.length?state.adminPartners:state.partners;
  document.querySelectorAll('[data-partner-count]').forEach(item=>item.textContent=String(items.length));
  const grid=document.querySelector('[data-partners-grid]');if(!grid)return;
  grid.innerHTML=items.length?`<div class="community-table-head"><span>Parceiro</span><span>Responsável</span><span>Contato</span><span>Atuação</span><span>Ações</span></div>${items.map(partner=>{const whatsapp=String(partner.whatsapp||'').replace(/\D/g,'');const instagram=safeExternalUrl(partner.instagramUrl);const website=safeExternalUrl(partner.websiteUrl);const email=String(partner.email||'').trim();const action=(href,label)=>href?`<a href="${escapeHtml(href)}" ${href.startsWith('http')?'target="_blank" rel="noopener noreferrer"':''}>${label}</a>`:'';return `<article class="community-table-row"><div class="community-partner"><div class="portal-partner-logo">${partner.logoData?`<img src="${partner.logoData}" alt="Logo de ${escapeHtml(partner.companyName)}">`:`<span>${escapeHtml(initials(partner.companyName))}</span>`}</div><div><strong>${escapeHtml(partner.companyName)}</strong><small>${escapeHtml(partner.login||'Parceiro')}</small></div></div><div data-label="Responsável"><strong>${escapeHtml(partner.fullName||'Não informado')}</strong><small>${escapeHtml(formatCnpj(partner.cnpj)||'CNPJ não informado')}</small></div><div data-label="Contato"><strong>${escapeHtml(email||'E-mail não informado')}</strong><small>${escapeHtml(partner.whatsapp||'WhatsApp não informado')}</small></div><div data-label="Atuação"><span>${escapeHtml(partner.niche||'Não informada')}</span></div><div class="community-actions" data-label="Ações">${action(email?`mailto:${email}`:'','E-mail')}${action(whatsapp?`https://wa.me/${whatsapp}`:'','WhatsApp')}${action(instagram,'Instagram')}${action(website,'Site')}</div></article>`}).join('')}`:'<div class="empty-inline">Os parceiros cadastrados aparecerão aqui.</div>';
  adaptPartnerLogos(grid);
}
function renderData(){document.querySelectorAll('[data-event-count]').forEach(item=>item.textContent=String(state.events.length));renderUpcoming();prepareYearSelectors();renderCalendars();renderEventManagement();renderPartners()}

const normalizeAttendees=value=>Array.isArray(value)?value:(typeof value==='string'?(()=>{try{return JSON.parse(value)}catch{return []}})():[]);
const formatCnpj=value=>{const d=String(value||'').replace(/\D/g,'');return d.length===14?`${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`:value};
const maskCnpj=value=>{const d=String(value||'').replace(/\D/g,'').slice(0,14);let output=d.slice(0,2);if(d.length>2)output+=`.${d.slice(2,5)}`;if(d.length>5)output+=`.${d.slice(5,8)}`;if(d.length>8)output+=`/${d.slice(8,12)}`;if(d.length>12)output+=`-${d.slice(12,14)}`;return output};
const filteredRegistrations=()=>state.registrations.filter(item=>(!state.registrationEvent||item.eventId===state.registrationEvent)&&(!state.registrationQuery||[item.eventTitle,item.companyName,item.industry,item.email,item.whatsapp,item.inviteCode,...normalizeAttendees(item.attendeeNames)].join(' ').toLowerCase().includes(state.registrationQuery)));
function renderRegistrationManager(){
  const list=document.querySelector('[data-registration-list]');if(!list)return;const allAttendees=state.registrations.reduce((sum,item)=>sum+normalizeAttendees(item.attendeeNames).length,0);document.querySelector('[data-registration-count]').textContent=String(state.registrations.length);document.querySelector('[data-attendee-count]').textContent=`${allAttendees} participante${allAttendees===1?'':'s'}`;
  const select=document.querySelector('[data-registration-event-filter]');const current=state.registrationEvent;const eventOptions=[...new Map(state.registrations.map(item=>[item.eventId,{id:item.eventId,title:item.eventTitle,date:item.eventDate}])).values()];select.innerHTML='<option value="">Todos os eventos</option>'+eventOptions.map(item=>`<option value="${item.id}">${escapeHtml(item.title)} — ${escapeHtml(shortDate(item.date))}</option>`).join('');select.value=current;
  const items=filteredRegistrations();list.innerHTML=items.length?items.map(item=>{const attendees=normalizeAttendees(item.attendeeNames);return `<article class="registration-row" data-registration-row="${item.id}"><time class="registration-date">${escapeHtml(shortDate(item.eventDate))}<small>${escapeHtml(item.eventTitle)}</small></time><div class="registration-person"><strong>${escapeHtml(attendees.join(', ')||'Participante não informado')}</strong><span>${escapeHtml(item.email)} · ${escapeHtml(item.whatsapp)}</span></div><div class="registration-company"><strong>${escapeHtml(item.companyName)}</strong><span>${escapeHtml(item.industry)}</span></div><div class="registration-code"><code>${escapeHtml(item.inviteCode)}</code><span>${item.source==='portal'?'Área do usuário':'Site público'}</span></div><div class="registration-actions"><button type="button" data-registration-detail="${item.id}">Detalhes</button><button type="button" data-registration-delete="${item.id}">Cancelar</button></div><div class="registration-detail" data-registration-detail-panel="${item.id}" hidden><div><small>Nome(s) do(s) inscrito(s)</small><span>${escapeHtml(attendees.join(' · ')||'Não informado')}</span></div><div><small>Empresa</small><span>${escapeHtml(item.companyName)}</span></div><div><small>CNPJ</small><span>${escapeHtml(formatCnpj(item.cnpj))}</span></div><div><small>WhatsApp</small><span>${escapeHtml(item.whatsapp)}</span></div><div><small>E-mail</small><span>${escapeHtml(item.email)}</span></div><div><small>Inscrição realizada</small><span>${escapeHtml(new Date(item.createdAt).toLocaleString('pt-BR'))}</span></div><div><small>Usuário vinculado</small><span>${escapeHtml(item.userLogin||'Inscrição pública')}</span></div></div></article>`}).join(''):'<div class="empty-inline">Nenhuma inscrição encontrada para este filtro.</div>';
}
function renderPromoSetting(){document.querySelectorAll('[data-promo-toggle]').forEach(button=>{const target=button.dataset.promoToggle;const enabled=target==='folder'?state.eventFolderEnabled:state.eventAlertEnabled;button.setAttribute('aria-pressed',String(enabled));const status=document.querySelector(`[data-promo-status="${target}"]`);if(status)status.textContent=enabled?'Ativado':'Desativado'})}
async function loadAdminManagement(){const [registrationsResponse,settingsResponse,partnersResponse]=await Promise.all([fetch('/api/registrations'),fetch('/api/event-settings'),fetch('/api/partners')]);if(!registrationsResponse.ok||!settingsResponse.ok||!partnersResponse.ok)throw new Error('Não foi possível carregar o gerenciamento administrativo.');state.registrations=(await registrationsResponse.json()).registrations||[];state.adminPartners=(await partnersResponse.json()).partners||[];const settings=await settingsResponse.json();state.eventFolderEnabled=settings.eventFolderEnabled!==false;state.eventAlertEnabled=settings.eventAlertEnabled!==false;renderRegistrationManager();renderPromoSetting();renderPartners()}

async function loadPublicData(){const response=await fetch('/api/public-data');if(!response.ok)throw new Error('Não foi possível carregar a agenda.');const data=await response.json();state.events=data.events||[];state.partners=data.partners||[];renderData()}

async function loadProfile(){
  const response=await fetch('/api/profile');if(!response.ok)throw new Error('Não foi possível carregar o perfil.');const {profile}=await response.json();state.profile=profile;
  document.querySelectorAll('.profile-form').forEach(form=>{form.elements.companyName.value=profile.company_name||'';form.elements.niche.value=profile.niche||'';if(form.elements.fullName)form.elements.fullName.value=profile.full_name||'';if(form.elements.cnpj)form.elements.cnpj.value=formatCnpj(profile.cnpj||'');if(form.elements.email)form.elements.email.value=profile.contact_email||'';if(form.elements.whatsapp)form.elements.whatsapp.value=profile.whatsapp||'';if(form.elements.instagramUrl)form.elements.instagramUrl.value=profile.instagram_url||'';if(form.elements.websiteUrl)form.elements.websiteUrl.value=profile.website_url||'';setLogo(form.querySelector('[data-logo-preview]'),profile.logo_data,profile.company_name)});
  document.querySelectorAll('[data-company-greeting]').forEach(item=>item.textContent=profile.company_name||item.textContent);
  document.querySelectorAll('[data-profile-status]').forEach(item=>item.textContent=profile.logo_data&&profile.niche&&profile.full_name&&profile.cnpj&&profile.contact_email?'Completo':'Pendente');
}

async function loadTestimonial(){
  const form=document.querySelector('.testimonial-form');if(!form)return;
  const response=await fetch('/api/testimonial');if(!response.ok)throw new Error('Não foi possível carregar o depoimento.');
  const {testimonial}=await response.json();form.elements.content.value=testimonial.content||'';form.querySelector('[data-testimonial-count]').textContent=String(form.elements.content.value.length);
}

document.querySelectorAll('.profile-form').forEach(form=>{
  const fileInput=form.elements.logo;
  if(form.elements.cnpj)form.elements.cnpj.addEventListener('input',event=>event.target.value=maskCnpj(event.target.value));
  fileInput.addEventListener('change',async()=>{const file=fileInput.files[0];if(!file)return;const feedback=form.querySelector('.form-feedback');if(file.size>8*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){feedback.textContent='Escolha uma imagem PNG, JPG ou WebP de até 8 MB.';fileInput.value='';return}feedback.textContent='Ajustando largura e altura do logo…';try{state.logoData=await normalizeLogo(file);setLogo(form.querySelector('[data-logo-preview]'),state.logoData,form.elements.companyName.value);feedback.textContent='Logo ajustado automaticamente.'}catch{feedback.textContent='Não foi possível processar esta imagem.';fileInput.value=''}});
  form.addEventListener('submit',async event=>{event.preventDefault();const feedback=form.querySelector('.form-feedback');const button=form.querySelector('.primary-action');button.disabled=true;feedback.textContent='Salvando…';try{const response=await fetch('/api/profile',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({fullName:form.elements.fullName?.value||'',cnpj:form.elements.cnpj?.value||'',email:form.elements.email?.value||'',companyName:form.elements.companyName.value,niche:form.elements.niche.value,logoData:state.logoData,whatsapp:form.elements.whatsapp?.value||'',instagramUrl:form.elements.instagramUrl?.value||'',websiteUrl:form.elements.websiteUrl?.value||''})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||'Não foi possível salvar.');feedback.textContent=data.message;state.logoData=null;await Promise.all([loadProfile(),loadPublicData(),...(expectedRole==='admin'?[loadAdminManagement()]:[])])}catch(error){feedback.textContent=error.message}finally{button.disabled=false}});
});

const testimonialForm=document.querySelector('.testimonial-form');
if(testimonialForm){
  const textarea=testimonialForm.elements.content;const count=testimonialForm.querySelector('[data-testimonial-count]');textarea.addEventListener('input',()=>count.textContent=String(textarea.value.length));
  testimonialForm.addEventListener('submit',async event=>{event.preventDefault();const button=testimonialForm.querySelector('.primary-action');const feedback=testimonialForm.querySelector('.form-feedback');button.disabled=true;feedback.textContent='Publicando…';try{const response=await fetch('/api/testimonial',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({content:textarea.value})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||'Não foi possível publicar.');feedback.textContent=data.message}catch(error){feedback.textContent=error.message}finally{button.disabled=false}});
}

const eventForm=document.querySelector('.event-form');
const eventFormToggle=document.querySelector('[data-toggle-event-form]');
function setEventFormOpen(open){if(!eventForm)return;eventForm.hidden=!open;eventForm.closest('.agenda-layout').classList.toggle('is-form-collapsed',!open);if(eventFormToggle){eventFormToggle.setAttribute('aria-expanded',String(open));eventFormToggle.textContent=open?'Fechar formulário':'＋ Novo evento'}}
function resetEventForm(close=false){if(!eventForm)return;eventForm.reset();eventForm.elements.id.value='';eventForm.querySelector('[data-event-form-title]').textContent='Novo evento';eventForm.querySelector('[data-cancel-edit]').hidden=true;eventForm.querySelector('.primary-action').textContent='Salvar evento';if(close)setEventFormOpen(false)}
if(eventForm){
  eventFormToggle?.addEventListener('click',()=>{if(eventForm.hidden){resetEventForm();setEventFormOpen(true);eventForm.querySelector('[name="title"]').focus()}else resetEventForm(true)});
  eventForm.querySelector('[data-cancel-edit]').addEventListener('click',()=>resetEventForm(true));
  eventForm.addEventListener('submit',async event=>{event.preventDefault();const feedback=eventForm.querySelector('.form-feedback');const button=eventForm.querySelector('.primary-action');button.disabled=true;feedback.textContent='Salvando…';const payload=Object.fromEntries(new FormData(eventForm));try{const response=await fetch('/api/events',{method:payload.id?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||'Não foi possível salvar o evento.');resetEventForm(true);await loadPublicData()}catch(error){feedback.textContent=error.message}finally{button.disabled=false}});
  document.querySelector('[data-event-management]').addEventListener('click',async event=>{const editId=event.target.dataset.editEvent;const deleteId=event.target.dataset.deleteEvent;if(editId){const item=state.events.find(entry=>entry.id===editId);if(!item)return;setEventFormOpen(true);Object.entries({id:item.id,title:item.title,startDate:item.startDate,endDate:item.endDate,timeLabel:item.timeLabel,location:item.location,description:item.description}).forEach(([key,value])=>eventForm.elements[key].value=value||'');eventForm.querySelector('[data-event-form-title]').textContent='Editar evento';eventForm.querySelector('[data-cancel-edit]').hidden=false;eventForm.querySelector('.primary-action').textContent='Atualizar evento';eventForm.scrollIntoView({behavior:'smooth'})}if(deleteId&&confirm('Excluir este evento da programação?')){const response=await fetch('/api/events',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id:deleteId})});if(response.ok)await loadPublicData()}});
}

const registrationList=document.querySelector('[data-registration-list]');
if(registrationList){
  document.querySelector('[data-registration-search]').addEventListener('input',event=>{state.registrationQuery=event.target.value.trim().toLowerCase();renderRegistrationManager()});
  document.querySelector('[data-registration-event-filter]').addEventListener('change',event=>{state.registrationEvent=event.target.value;renderRegistrationManager()});
  registrationList.addEventListener('click',async event=>{const detailId=event.target.dataset.registrationDetail;const deleteId=event.target.dataset.registrationDelete;if(detailId){const panel=registrationList.querySelector(`[data-registration-detail-panel="${detailId}"]`);panel.hidden=!panel.hidden;event.target.textContent=panel.hidden?'Detalhes':'Ocultar'}if(deleteId&&confirm('Cancelar esta inscrição? O convite deixará de ser válido.')){event.target.disabled=true;const response=await fetch('/api/registrations',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id:deleteId})});const data=await response.json().catch(()=>({}));if(!response.ok){alert(data.message||'Não foi possível cancelar a inscrição.');event.target.disabled=false;return}state.registrations=state.registrations.filter(item=>item.id!==deleteId);renderRegistrationManager()}});
  document.querySelector('[data-export-registrations]').addEventListener('click',()=>{const items=filteredRegistrations();if(!items.length)return;const rows=[['Evento','Data','Participantes','Empresa','Ramo','CNPJ','WhatsApp','E-mail','Convite','Origem'],...items.map(item=>[item.eventTitle,item.eventDate,normalizeAttendees(item.attendeeNames).join(' | '),item.companyName,item.industry,formatCnpj(item.cnpj),item.whatsapp,item.email,item.inviteCode,item.source==='portal'?'Área do usuário':'Site público'])];const xmlRows=rows.map((row,index)=>`<Row>${row.map(value=>`<Cell ss:StyleID="${index?'Text':'Header'}"><Data ss:Type="String">${escapeHtml(value)}</Data></Cell>`).join('')}</Row>`).join('');const workbook=`<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#F1C75B" ss:Pattern="Solid"/></Style><Style ss:ID="Text"><NumberFormat ss:Format="@"/></Style></Styles><Worksheet ss:Name="Inscrições"><Table>${xmlRows}</Table></Worksheet></Workbook>`;const blob=new Blob([workbook],{type:'application/vnd.ms-excel;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`inscricoes-fonte-${new Date().toISOString().slice(0,10)}.xls`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)});
  document.querySelectorAll('[data-promo-toggle]').forEach(button=>button.addEventListener('click',async event=>{const target=event.currentTarget.dataset.promoToggle;const feedback=document.querySelector('[data-promo-feedback]');const current=target==='folder'?state.eventFolderEnabled:state.eventAlertEnabled;button.disabled=true;feedback.textContent='Salvando…';try{const response=await fetch('/api/event-settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({target,enabled:!current})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||'Não foi possível alterar.');if(target==='folder')state.eventFolderEnabled=data.enabled;else state.eventAlertEnabled=data.enabled;renderPromoSetting();feedback.textContent=data.message}catch(error){feedback.textContent=error.message}finally{button.disabled=false}}));
}

document.querySelector('.logout-button').addEventListener('click',async()=>{await fetch('/api/logout',{method:'POST'}).catch(()=>{});location.replace('/')});

async function start(){
  try{
    const response=await fetch('/api/session',{headers:{accept:'application/json'}});if(response.status===401){location.replace('/?login=1');return}if(!response.ok)throw new Error('O serviço de autenticação está indisponível.');
    const {user}=await response.json();if(expectedRole==='admin'&&user.role!=='admin'){location.replace('/partner.html');return}if(expectedRole==='partner'&&user.role==='admin'){location.replace('/dashboard.html');return}
    document.querySelector('[data-user-name]').textContent=user.login;document.querySelector('[data-user-role]').textContent=user.role==='admin'?'Administrador':'Parceiro';document.querySelectorAll('[data-user-greeting]').forEach(item=>item.textContent=user.login);
    await Promise.all([loadPublicData(),loadProfile(),loadTestimonial(),...(expectedRole==='admin'?[loadAdminManagement()]:[])]);body.classList.remove('dashboard-loading');showView(location.hash.slice(1)||'inicio',false);
  }catch(error){body.classList.remove('dashboard-loading');errorPanel.hidden=false;errorPanel.querySelector('span').textContent=error.message}
}
start();
