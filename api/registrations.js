import { randomBytes, randomUUID } from 'node:crypto';
import { authenticatedUser, database, ensureAppSchema, json } from '../server/auth.js';

const validId=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''));
const cleanDigits=(value,max)=>String(value||'').replace(/\D/g,'').slice(0,max);
const cleanText=(value,max)=>String(value||'').trim().replace(/\s+/g,' ').slice(0,max);
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validCnpj(value){
  const digits=cleanDigits(value,14);if(digits.length!==14||/^(\d)\1+$/.test(digits))return false;
  const check=(length,weights)=>{const sum=digits.slice(0,length).split('').reduce((total,digit,index)=>total+Number(digit)*weights[index],0);const result=sum%11;return result<2?0:11-result};
  return check(12,[5,4,3,2,9,8,7,6,5,4,3,2])===Number(digits[12])&&check(13,[6,5,4,3,2,9,8,7,6,5,4,3,2])===Number(digits[13]);
}

function input(body){
  const attendeeNames=(Array.isArray(body?.attendeeNames)?body.attendeeNames:[body?.fullName]).map(name=>cleanText(name,100)).filter(Boolean).slice(0,20);
  return {
    eventId:String(body?.eventId||''),source:body?.source==='portal'?'portal':'public',attendeeNames,
    companyName:cleanText(body?.companyName,120),industry:cleanText(body?.industry,120),cnpj:cleanDigits(body?.cnpj,14),
    whatsapp:cleanDigits(body?.whatsapp,15),email:cleanText(body?.email,180).toLowerCase()
  };
}

function validation(item){
  const fields={};
  if(!validId(item.eventId))fields.eventId='Selecione um evento válido.';
  if(!item.attendeeNames.length||item.attendeeNames.some(name=>name.length<3))fields.fullName='Informe o nome completo de cada participante.';
  if(item.companyName.length<2)fields.companyName='Informe o nome da empresa.';
  if(item.industry.length<2)fields.industry='Informe o ramo de atuação.';
  if(!validCnpj(item.cnpj))fields.cnpj='Informe um CNPJ válido.';
  if(item.whatsapp.length<10)fields.whatsapp='Informe um WhatsApp com DDD.';
  if(!emailPattern.test(item.email))fields.email='Informe um e-mail válido.';
  return fields;
}

export async function POST(request){
  try{
    const sql=database();await ensureAppSchema(sql);
    const item=input(await request.json());const fields=validation(item);
    if(Object.keys(fields).length)return json({message:'Revise os campos destacados.',fields},400);
    const user=await authenticatedUser(request,sql);
    if(item.source==='portal'&&!user)return json({message:'Entre na sua área para confirmar presença.',code:'LOGIN_REQUIRED'},401);
    if(item.source==='public'&&user)return json({message:'Você já possui cadastro. Faça a inscrição pela sua área de usuário.',code:'PARTNER_LOGIN_REQUIRED'},403);
    if(item.source==='public'){
      const [known]=await sql`SELECT id FROM app_users WHERE LOWER(email)=LOWER(${item.email}) AND active=TRUE LIMIT 1`;
      if(known)return json({message:'Este e-mail pertence a um usuário cadastrado. Entre na área do parceiro para confirmar presença.',code:'PARTNER_LOGIN_REQUIRED',fields:{email:'Use sua área de usuário para esta inscrição.'}},403);
    }
    const [event]=await sql`SELECT id,title,description,start_date::text AS "startDate",end_date::text AS "endDate",time_label AS "timeLabel",location FROM agenda_events WHERE id=${item.eventId} AND end_date>=CURRENT_DATE LIMIT 1`;
    if(!event)return json({message:'Este evento não está mais disponível para inscrição.',fields:{eventId:'Evento indisponível.'}},404);
    const duplicate=user
      ?await sql`SELECT email,whatsapp,user_id FROM event_registrations WHERE event_id=${item.eventId} AND (LOWER(email)=LOWER(${item.email}) OR whatsapp=${item.whatsapp} OR user_id=${user.id}) LIMIT 1`
      :await sql`SELECT email,whatsapp,user_id FROM event_registrations WHERE event_id=${item.eventId} AND (LOWER(email)=LOWER(${item.email}) OR whatsapp=${item.whatsapp}) LIMIT 1`;
    if(duplicate.length){
      const current=duplicate[0];const duplicateFields={};
      if(String(current.email).toLowerCase()===item.email)duplicateFields.email='Este e-mail já está inscrito neste evento.';
      if(current.whatsapp===item.whatsapp)duplicateFields.whatsapp='Este WhatsApp já está inscrito neste evento.';
      if(user&&current.user_id===user.id)duplicateFields.companyName='Este parceiro já confirmou presença neste evento.';
      return json({message:'Já existe uma inscrição com estes dados.',fields:duplicateFields},409);
    }
    const id=randomUUID();const inviteCode=`FONTE-${randomBytes(4).toString('hex').toUpperCase()}`;const attendeeJson=JSON.stringify(item.attendeeNames);
    await sql`INSERT INTO event_registrations (id,event_id,user_id,source,company_name,industry,cnpj,whatsapp,email,attendee_names,invite_code)
      VALUES (${id},${item.eventId},${user?.id||null},${item.source},${item.companyName},${item.industry},${item.cnpj},${item.whatsapp},${item.email},${attendeeJson}::jsonb,${inviteCode})`;
    return json({ok:true,registration:{id,inviteCode,attendeeNames:item.attendeeNames,companyName:item.companyName},event},201);
  }catch(error){
    console.error('registration_event_failed',error instanceof Error?error.message:error);
    if(error?.code==='23505')return json({message:'Já existe uma inscrição com estes dados.',fields:{email:'E-mail ou WhatsApp já utilizado neste evento.',whatsapp:'E-mail ou WhatsApp já utilizado neste evento.'}},409);
    return json({message:'Não foi possível concluir a inscrição.'},500);
  }
}
