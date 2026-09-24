const form=document.querySelector('.register-form');
const status=document.querySelector('.form-status');
const submit=form.querySelector('.register-submit');
const password=form.elements.password;
document.querySelector('[data-toggle-password]').addEventListener('click',event=>{
  const visible=password.type==='text';
  password.type=visible?'password':'text';
  event.currentTarget.textContent=visible?'Mostrar':'Ocultar';
});
form.addEventListener('submit',async event=>{
  event.preventDefault();status.textContent='';
  if(password.value!==form.elements.confirmPassword.value){status.textContent='As senhas precisam ser iguais.';return}
  submit.disabled=true;submit.querySelector('span').textContent='Criando seu acesso…';
  try{
    const response=await fetch('/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({companyName:form.elements.companyName.value,niche:form.elements.niche.value,login:form.elements.login.value,email:form.elements.email.value,password:password.value})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message||'Não foi possível concluir o cadastro.');
    location.assign('/partner.html');
  }catch(error){status.textContent=error.message;submit.disabled=false;submit.querySelector('span').textContent='Criar conta de parceiro'}
});
