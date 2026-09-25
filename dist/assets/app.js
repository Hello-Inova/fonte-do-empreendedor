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

const siteHeader=document.querySelector('.site-header');
const navToggle=document.querySelector('.nav-toggle');
const siteNav=document.querySelector('.site-nav');
if(siteHeader&&navToggle&&siteNav){
  const blockedWhileMenuOpen=[document.querySelector('main'),document.querySelector('footer'),document.querySelector('.site-header > .brand'),document.querySelector('.access-trigger')].filter(Boolean);
  function setSiteNavState(open){
    siteHeader.classList.toggle('nav-open',open);
    document.body.classList.toggle('nav-open',open);
    blockedWhileMenuOpen.forEach(element=>{element.inert=open});
    navToggle.setAttribute('aria-expanded',String(open));
    navToggle.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');
  }
  function closeSiteNav(){
    setSiteNavState(false);
  }
  navToggle.addEventListener('click',()=>{
    setSiteNavState(!siteHeader.classList.contains('nav-open'));
  });
  siteHeader.addEventListener('click',event=>{if(event.target===siteHeader&&siteHeader.classList.contains('nav-open'))closeSiteNav()});
  siteNav.addEventListener('click',event=>{if(event.target.closest('a'))closeSiteNav()});
  addEventListener('keydown',event=>{if(event.key==='Escape'&&siteHeader.classList.contains('nav-open')){closeSiteNav();navToggle.focus()}});
  addEventListener('resize',()=>{if(innerWidth>900)closeSiteNav()});
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
    accessModal.querySelector('input[name="login"]').focus();
  }
  function closeAccessModal(){
    accessModal.close();
    document.body.classList.remove('modal-open');
    accessTrigger.focus();
  }

  accessTrigger.addEventListener('click',()=>{
    if(innerWidth<=900){
      openAccessModal();
      return;
    }
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
    accessIntro.textContent=resetMode?'Informe seu usuário ou e-mail para receber as instruções de redefinição.':'Entre com seu usuário ou e-mail e senha para continuar.';
    resetLink.textContent=resetMode?'Voltar ao login':'Esqueci minha senha';
    submitLabel.textContent=resetMode?'Enviar instruções':'Entrar';
    accessStatus.textContent='';
    accessModal.querySelector('input[name="login"]').focus();
  });
  accessForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(accessForm.dataset.mode==='reset'){
      accessStatus.textContent='A redefinição por e-mail será ativada na próxima etapa de integração.';
      return;
    }
    const submitButton=accessForm.querySelector('.access-submit');
    submitButton.disabled=true;
    submitLabel.textContent='Entrando…';
    accessStatus.textContent='';
    const payload={login:accessForm.elements.login.value.trim(),password:accessForm.elements.senha.value};
    fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)})
      .then(async response=>({ok:response.ok,data:await response.json().catch(()=>({}))}))
      .then(({ok,data})=>{
        if(!ok)throw new Error(data.message||'Não foi possível entrar.');
        location.assign(data.user?.role==='admin'?'/dashboard.html':'/partner.html');
      })
      .catch(error=>{accessStatus.textContent=error.message})
      .finally(()=>{submitButton.disabled=false;submitLabel.textContent='Entrar'});
  });

  if(new URLSearchParams(location.search).get('login')==='1'){
    accessTrigger.classList.add('is-ready');
    accessTrigger.setAttribute('aria-expanded','true');
    openAccessModal();
  }
}
