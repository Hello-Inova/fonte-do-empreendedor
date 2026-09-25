const publicMonths=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const weekDays=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const publicToday=new Date();
const publicState={events:[],partners:[],testimonials:[],year:publicToday.getFullYear(),month:publicToday.getMonth(),partnerIndex:0,testimonialIndex:0};
const publicEscape=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const publicDate=value=>new Date(`${String(value).slice(0,10)}T12:00:00`);
const publicInitials=name=>String(name||'AF').split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
function publicSafeUrl(value){try{const url=new URL(String(value||''));return ['http:','https:'].includes(url.protocol)?url.toString():''}catch{return ''}}
function partnerContactActions(partner){
  const whatsapp=String(partner.whatsapp||'').replace(/\D/g,'');const instagram=publicSafeUrl(partner.instagramUrl);const website=publicSafeUrl(partner.websiteUrl);
  const icons={WhatsApp:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.7a8 8 0 0 1-11.8 7l-4.2 1 1.1-4A8 8 0 1 1 20 11.7Z"/><path d="M9 8.3c.3-.7.6-.7 1-.7l.5.1c.2 0 .4.5.7 1.2.2.6.2.7 0 1l-.5.7c-.2.2-.3.4 0 .8.6 1 1.4 1.8 2.5 2.3.4.2.6.2.8-.1l.8-1c.2-.3.4-.3.7-.2l1.5.7c.4.2.6.3.6.5 0 .2-.2 1.3-.8 1.8-.5.5-1.3.9-2.1.8-1-.1-2.3-.5-4-1.7-2.2-1.8-3.5-4-3.6-5.1 0-.5.2-.8.4-1.1l.5-.8Z"/></svg>',Instagram:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle class="icon-fill" cx="17.4" cy="6.7" r="1"/></svg>',Site:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3.5 12h17M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21M12 3c-2.3 2.5-3.5 5.5-3.5 9s1.2 6.5 3.5 9"/></svg>'};
  const action=(href,label,className)=>href?`<a class="${className}" href="${publicEscape(href)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${label} de ${publicEscape(partner.companyName)}" title="${label}">${icons[label]}</a>`:'';
  const actions=`${action(whatsapp?`https://wa.me/${whatsapp}`:'','WhatsApp','is-whatsapp')}${action(instagram,'Instagram','is-instagram')}${action(website,'Site','is-website')}`;
  return actions?`<div class="partner-actions" aria-label="Contatos de ${publicEscape(partner.companyName)}">${actions}</div>`:'<p class="partner-contact-empty">Contatos em breve</p>';
}

function renderPublicCalendar(){
  const calendar=document.querySelector('[data-public-calendar]');
  const firstDay=new Date(publicState.year,publicState.month,1).getDay();
  const totalDays=new Date(publicState.year,publicState.month+1,0).getDate();
  const cells=[];
  for(let empty=0;empty<firstDay;empty++)cells.push('<span class="calendar-day is-empty" aria-hidden="true"></span>');
  for(let day=1;day<=totalDays;day++){
    const dateKey=`${publicState.year}-${String(publicState.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const events=publicState.events.filter(event=>event.startDate.slice(0,10)===dateKey);
    const title=events.map(event=>event.title).join(', ');
    cells.push(`<span class="calendar-day${events.length?' has-event':''}" ${title?`title="${publicEscape(title)}"`:''}><b>${day}</b>${events.length?`<i></i><small>${publicEscape(events[0].title)}</small>`:''}</span>`);
  }
  calendar.innerHTML=`<article class="public-month"><header class="calendar-toolbar"><button type="button" data-calendar-prev aria-label="Ver mês anterior">←</button><h3>${publicMonths[publicState.month]} <span>${publicState.year}</span></h3><button type="button" data-calendar-next aria-label="Ver próximo mês">→</button></header><div class="week-row">${weekDays.map(day=>`<span>${day}</span>`).join('')}</div><div class="month-grid">${cells.join('')}</div></article>`;
  calendar.querySelector('[data-calendar-prev]').addEventListener('click',()=>changePublicMonth(-1));
  calendar.querySelector('[data-calendar-next]').addEventListener('click',()=>changePublicMonth(1));
}

function changePublicMonth(delta){
  const target=new Date(publicState.year,publicState.month+delta,1);
  publicState.year=target.getFullYear();publicState.month=target.getMonth();
  const select=document.querySelector('[data-public-year]');
  if(![...select.options].some(option=>Number(option.value)===publicState.year))select.add(new Option(String(publicState.year),String(publicState.year)));
  select.value=String(publicState.year);renderPublicCalendar();
}

function renderPublicPartners(){
  const track=document.querySelector('[data-public-partners]');
  track.innerHTML=publicState.partners.length?publicState.partners.map(partner=>`<article class="public-partner-card"><div class="public-partner-logo">${partner.logoData?`<img src="${partner.logoData}" alt="Logo de ${publicEscape(partner.companyName)}">`:`<span>${publicEscape(publicInitials(partner.companyName))}</span>`}</div><h4>${publicEscape(partner.companyName)}</h4><p>${publicEscape(partner.niche||'Parceiro da Fonte do Empreendedor')}</p>${partnerContactActions(partner)}</article>`).join(''):'<article class="public-partner-empty">Os novos parceiros aparecerão aqui.</article>';
  adaptPartnerLogos(track);
  movePartners(0);
}
function movePartners(delta){const track=document.querySelector('[data-public-partners]');const cards=[...track.querySelectorAll('.public-partner-card')];if(!cards.length)return;publicState.partnerIndex=Math.max(0,Math.min(cards.length-1,publicState.partnerIndex+delta));const gap=parseFloat(getComputedStyle(track).gap)||0;track.style.transform=`translate3d(${-publicState.partnerIndex*(cards[0].getBoundingClientRect().width+gap)}px,0,0)`}

function renderTestimonials(){
  const carousel=document.querySelector('.testimonial-carousel');const track=carousel.querySelector('.story-track');const dots=carousel.querySelector('.carousel-dots');
  const items=publicState.testimonials;
  track.innerHTML=items.length?items.map((item,index)=>`<article class="story-card${index===0?' is-current':''}" aria-label="${index+1} de ${items.length}"><div class="story-card-top"><span>“</span><div class="testimonial-logo">${item.logoData?`<img src="${item.logoData}" alt="Logo de ${publicEscape(item.companyName)}">`:`<b>${publicEscape(publicInitials(item.companyName))}</b>`}</div></div><h3>${publicEscape(item.companyName)}</h3><p>${publicEscape(item.content)}</p><small>${publicEscape(item.niche||'Parceiro da Fonte')}</small></article>`).join(''):'<article class="story-card is-current"><span>“</span><h3>Em breve</h3><p>Os depoimentos publicados pelos parceiros aparecerão aqui.</p><small>Comunidade da Fonte</small></article>';
  dots.innerHTML=items.map((_,index)=>`<button type="button" data-slide="${index}" aria-label="Ver depoimento ${index+1}"></button>`).join('');
  adaptPartnerLogos(track);
  publicState.testimonialIndex=0;updateTestimonials(0);
}
function updateTestimonials(index){
  const carousel=document.querySelector('.testimonial-carousel');const track=carousel.querySelector('.story-track');const slides=[...track.querySelectorAll('.story-card')];const dots=[...carousel.querySelectorAll('.carousel-dots button')];if(!slides.length)return;
  publicState.testimonialIndex=(index+slides.length)%slides.length;const gap=parseFloat(getComputedStyle(track).gap)||0;track.style.transform=`translate3d(${-publicState.testimonialIndex*(slides[0].getBoundingClientRect().width+gap)}px,0,0)`;
  slides.forEach((slide,i)=>{slide.classList.toggle('is-current',i===publicState.testimonialIndex);slide.setAttribute('aria-hidden',i===publicState.testimonialIndex?'false':'true')});dots.forEach((dot,i)=>{dot.classList.toggle('active',i===publicState.testimonialIndex);dot.toggleAttribute('aria-current',i===publicState.testimonialIndex)});
  carousel.querySelector('.carousel-count').innerHTML=`<span>${String(publicState.testimonialIndex+1).padStart(2,'0')}</span> / ${String(slides.length).padStart(2,'0')}`;
}

document.querySelector('[data-partner-prev]').addEventListener('click',()=>movePartners(-1));
document.querySelector('[data-partner-next]').addEventListener('click',()=>movePartners(1));
document.querySelector('.carousel-prev').addEventListener('click',()=>updateTestimonials(publicState.testimonialIndex-1));
document.querySelector('.carousel-next').addEventListener('click',()=>updateTestimonials(publicState.testimonialIndex+1));
document.querySelector('.carousel-dots').addEventListener('click',event=>{if(event.target.dataset.slide!=null)updateTestimonials(Number(event.target.dataset.slide))});
document.querySelector('.story-viewport').addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();updateTestimonials(publicState.testimonialIndex-1)}if(event.key==='ArrowRight'){event.preventDefault();updateTestimonials(publicState.testimonialIndex+1)}});
addEventListener('resize',()=>{movePartners(0);updateTestimonials(publicState.testimonialIndex)},{passive:true});

fetch('/api/public-data').then(async response=>{if(!response.ok)throw new Error();return response.json()}).then(data=>{
  publicState.events=data.events||[];publicState.partners=data.partners||[];publicState.testimonials=data.testimonials||[];
  const years=new Set([new Date().getFullYear()-1,new Date().getFullYear(),new Date().getFullYear()+1,...publicState.events.map(event=>publicDate(event.startDate).getFullYear())]);const select=document.querySelector('[data-public-year]');select.innerHTML=[...years].sort().map(year=>`<option value="${year}">${year}</option>`).join('');select.value=String(publicState.year);select.addEventListener('change',()=>{publicState.year=Number(select.value);renderPublicCalendar()});
  renderPublicCalendar();renderPublicPartners();renderTestimonials();
}).catch(()=>{document.querySelector('[data-public-calendar]').innerHTML='<p class="data-error">A programação está temporariamente indisponível.</p>'});
