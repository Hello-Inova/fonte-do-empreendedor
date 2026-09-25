const publicMonths=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const weekDays=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const publicToday=new Date();
const publicState={events:[],partners:[],testimonials:[],year:publicToday.getFullYear(),month:publicToday.getMonth(),partnerIndex:0,testimonialIndex:0};
const publicEscape=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const publicDate=value=>new Date(`${String(value).slice(0,10)}T12:00:00`);
const publicInitials=name=>String(name||'AF').split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();

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
  track.innerHTML=publicState.partners.length?publicState.partners.map(partner=>`<article class="public-partner-card"><div class="public-partner-logo">${partner.logoData?`<img src="${partner.logoData}" alt="Logo de ${publicEscape(partner.companyName)}">`:`<span>${publicEscape(publicInitials(partner.companyName))}</span>`}</div><h4>${publicEscape(partner.companyName)}</h4><p>${publicEscape(partner.niche||'Parceiro da Fonte do Empreendedor')}</p></article>`).join(''):'<article class="public-partner-empty">Os novos parceiros aparecerão aqui.</article>';
  adaptPartnerLogos(track);
  movePartners(0);
}
function movePartners(delta){const track=document.querySelector('[data-public-partners]');const cards=[...track.querySelectorAll('.public-partner-card')];if(!cards.length)return;publicState.partnerIndex=Math.max(0,Math.min(cards.length-1,publicState.partnerIndex+delta));const gap=parseFloat(getComputedStyle(track).gap)||0;track.style.transform=`translate3d(${-publicState.partnerIndex*(cards[0].getBoundingClientRect().width+gap)}px,0,0)`}

function renderTestimonials(){
  const carousel=document.querySelector('.testimonial-carousel');const track=carousel.querySelector('.story-track');const dots=carousel.querySelector('.carousel-dots');
  const items=publicState.testimonials;
  track.innerHTML=items.length?items.map((item,index)=>`<article class="story-card${index===0?' is-current':''}" aria-label="${index+1} de ${items.length}"><span>“</span><h3>${publicEscape(item.companyName)}</h3><p>${publicEscape(item.content)}</p><small>${publicEscape(item.niche||'Parceiro da Fonte')}</small></article>`).join(''):'<article class="story-card is-current"><span>“</span><h3>Em breve</h3><p>Os depoimentos publicados pelos parceiros aparecerão aqui.</p><small>Comunidade da Fonte</small></article>';
  dots.innerHTML=items.map((_,index)=>`<button type="button" data-slide="${index}" aria-label="Ver depoimento ${index+1}"></button>`).join('');
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
