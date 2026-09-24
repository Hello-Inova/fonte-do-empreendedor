const body=document.body;
const menuToggle=document.querySelector('.menu-toggle');
const closeTargets=document.querySelectorAll('[data-close-menu]');
const navLinks=[...document.querySelectorAll('.sidebar nav a')];
const errorPanel=document.querySelector('.dashboard-error');

function closeMenu(){body.classList.remove('menu-open');menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label','Abrir menu')}
menuToggle.addEventListener('click',()=>{const open=body.classList.toggle('menu-open');menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Fechar menu':'Abrir menu')});
closeTargets.forEach(item=>item.addEventListener('click',closeMenu));
navLinks.forEach(link=>link.addEventListener('click',()=>{navLinks.forEach(item=>{item.classList.toggle('active',item===link);item.removeAttribute('aria-current')});link.setAttribute('aria-current','page');closeMenu()}));

async function loadSession(){
  try{
    const response=await fetch('/api/session',{headers:{accept:'application/json'}});
    if(response.status===401){location.replace('/');return}
    if(!response.ok)throw new Error('O serviço de autenticação está indisponível.');
    const {user}=await response.json();
    document.querySelector('[data-user-name]').textContent=user.login;
    document.querySelector('[data-user-role]').textContent=user.role==='admin'?'Administrador':user.role;
    document.querySelector('[data-user-greeting]').textContent=user.login;
    body.classList.remove('dashboard-loading');
  }catch(error){
    body.classList.remove('dashboard-loading');
    errorPanel.hidden=false;
    errorPanel.querySelector('span').textContent=error.message;
  }
}

document.querySelector('.logout-button').addEventListener('click',async()=>{
  await fetch('/api/logout',{method:'POST'}).catch(()=>{});
  location.replace('/');
});

loadSession();
