import * as THREE from 'three';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.querySelector('#three-stage');
const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, innerWidth/innerHeight, .1, 100);
camera.position.z = 6;

const geometry = new THREE.BufferGeometry();
const count = innerWidth < 700 ? 420 : 950;
const positions = new Float32Array(count * 3);
for(let i=0;i<count*3;i+=3){positions[i]=(Math.random()-.5)*12;positions[i+1]=(Math.random()-.5)*8;positions[i+2]=(Math.random()-.5)*7}
geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
const material = new THREE.PointsMaterial({color:0xf1c75b,size:.018,transparent:true,opacity:.44,blending:THREE.AdditiveBlending});
const particles = new THREE.Points(geometry,material);
scene.add(particles);

const ring = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.35,.018,180,12,2,5),
  new THREE.MeshBasicMaterial({color:0xf1c75b,transparent:true,opacity:.14})
);
ring.position.set(2.8,.2,-1.5);
ring.rotation.x=.8;
scene.add(ring);

let px=0,py=0,scrollProgress=0;
addEventListener('pointermove',e=>{px=(e.clientX/innerWidth-.5)*.18;py=(e.clientY/innerHeight-.5)*.12},{passive:true});
addEventListener('scroll',()=>{scrollProgress=scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)},{passive:true});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false)}
addEventListener('resize',resize);resize();
function tick(t){particles.rotation.y += (px+scrollProgress*.7-particles.rotation.y)*.025;particles.rotation.x += (-py-particles.rotation.x)*.025;if(!reduced){particles.rotation.z=t*.000018;ring.rotation.y=t*.00011;ring.rotation.z=-t*.00007}ring.position.y=.2-scrollProgress*2.4;renderer.render(scene,camera);requestAnimationFrame(tick)}
requestAnimationFrame(tick);

const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.18});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

const starButtons=[...document.querySelectorAll('.stars button')];
const ratingResponse=document.querySelector('.rating-response');
const ratingMessages={1:'Obrigado pela sinceridade. Queremos ouvir como podemos melhorar.',2:'Obrigado por avaliar. Sua experiência importa para nós.',3:'Obrigado! Estamos construindo essa jornada com você.',4:'Que bom saber disso. Obrigado por caminhar conosco!',5:'Que alegria! Obrigado por fazer parte desta história.'};
function setRating(value){
  starButtons.forEach(button=>{
    const active=Number(button.dataset.rating)<=value;
    button.classList.toggle('active',active);
    button.setAttribute('aria-checked',Number(button.dataset.rating)===value?'true':'false');
  });
  ratingResponse.textContent=ratingMessages[value];
  localStorage.setItem('fonte-avaliacao',String(value));
}
starButtons.forEach(button=>button.addEventListener('click',()=>setRating(Number(button.dataset.rating))));
const savedRating=Number(localStorage.getItem('fonte-avaliacao'));
if(savedRating>=1&&savedRating<=5)setRating(savedRating);

const carousel=document.querySelector('.testimonial-carousel');
if(carousel){
  const viewport=carousel.querySelector('.story-viewport');
  const track=carousel.querySelector('.story-track');
  const slides=[...carousel.querySelectorAll('.story-card')];
  const dots=[...carousel.querySelectorAll('.carousel-dots button')];
  const countCurrent=carousel.querySelector('.carousel-count span');
  let currentSlide=0;
  function updateCarousel(index){
    currentSlide=(index+slides.length)%slides.length;
    const gap=parseFloat(getComputedStyle(track).gap)||0;
    const distance=slides[0].getBoundingClientRect().width+gap;
    track.style.transform=`translate3d(${-currentSlide*distance}px,0,0)`;
    slides.forEach((slide,i)=>{slide.classList.toggle('is-current',i===currentSlide);slide.setAttribute('aria-hidden',i===currentSlide?'false':'true')});
    dots.forEach((dot,i)=>{dot.classList.toggle('active',i===currentSlide);if(i===currentSlide)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current')});
    countCurrent.textContent=String(currentSlide+1).padStart(2,'0');
  }
  carousel.querySelector('.carousel-prev').addEventListener('click',()=>updateCarousel(currentSlide-1));
  carousel.querySelector('.carousel-next').addEventListener('click',()=>updateCarousel(currentSlide+1));
  dots.forEach(dot=>dot.addEventListener('click',()=>updateCarousel(Number(dot.dataset.slide))));
  viewport.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();updateCarousel(currentSlide-1)}if(event.key==='ArrowRight'){event.preventDefault();updateCarousel(currentSlide+1)}});
  addEventListener('resize',()=>updateCarousel(currentSlide),{passive:true});
  updateCarousel(0);
}

const accessTrigger=document.querySelector('.access-trigger');
const accessModal=document.querySelector('#access-modal');
if(accessTrigger&&accessModal){
  const closeButton=accessModal.querySelector('.access-close');
  const accessForm=accessModal.querySelector('.access-form');
  const accessStatus=accessModal.querySelector('.access-status');
  const accessIntro=accessModal.querySelector('.access-intro');
  const passwordLabel=accessModal.querySelector('.password-label');
  const passwordInput=accessModal.querySelector('input[name="senha"]');
  const passwordToggle=accessModal.querySelector('.password-toggle');
  const resetLink=accessModal.querySelector('.password-reset-link');
  const submitLabel=accessModal.querySelector('.access-submit-label');

  function openAccessModal(){
    accessModal.showModal();
    document.body.classList.add('modal-open');
    accessModal.querySelector('input[name="email"]').focus();
  }
  function closeAccessModal(){
    accessModal.close();
    document.body.classList.remove('modal-open');
    accessTrigger.focus();
  }

  accessTrigger.addEventListener('click',()=>{
    if(!accessTrigger.classList.contains('is-ready')){
      accessTrigger.classList.add('is-ready');
      accessTrigger.setAttribute('aria-expanded','true');
      accessTrigger.setAttribute('aria-label','Abrir área de acesso');
      return;
    }
    openAccessModal();
  });
  closeButton.addEventListener('click',closeAccessModal);
  accessModal.addEventListener('click',event=>{if(event.target===accessModal)closeAccessModal()});
  accessModal.addEventListener('close',()=>document.body.classList.remove('modal-open'));
  passwordToggle.addEventListener('click',()=>{
    const showing=passwordInput.type==='text';
    passwordInput.type=showing?'password':'text';
    passwordToggle.textContent=showing?'Mostrar':'Ocultar';
    passwordToggle.setAttribute('aria-label',showing?'Mostrar senha':'Ocultar senha');
    passwordToggle.setAttribute('aria-pressed',String(!showing));
  });
  resetLink.addEventListener('click',event=>{
    event.preventDefault();
    const resetMode=accessForm.dataset.mode!=='reset';
    accessForm.dataset.mode=resetMode?'reset':'login';
    passwordLabel.hidden=resetMode;
    passwordInput.required=!resetMode;
    accessIntro.textContent=resetMode?'Informe seu e-mail para receber as instruções de redefinição.':'Entre com seu e-mail e senha para continuar.';
    resetLink.textContent=resetMode?'Voltar ao login':'Esqueci minha senha';
    submitLabel.textContent=resetMode?'Enviar instruções':'Entrar';
    accessStatus.textContent='';
    accessModal.querySelector('input[name="email"]').focus();
  });
  accessForm.addEventListener('submit',event=>{
    event.preventDefault();
    accessStatus.textContent=accessForm.dataset.mode==='reset'
      ?'A redefinição está preparada. O envio do e-mail será ativado quando a autenticação estiver conectada.'
      :'Acesso preparado. A autenticação e a identificação automática do perfil serão liberadas quando a área restrita estiver conectada.';
  });
}
