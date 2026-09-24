import { randomUUID } from 'node:crypto';
import { authenticatedUser, database, ensureAppSchema, json } from '../server/auth.js';

function eventInput(body){
  const item={
    title:String(body?.title||'').trim().slice(0,120),
    description:String(body?.description||'').trim().slice(0,600),
    startDate:String(body?.startDate||''),
    endDate:String(body?.endDate||body?.startDate||''),
    timeLabel:String(body?.timeLabel||'').trim().slice(0,50),
    location:String(body?.location||'').trim().slice(0,140)
  };
  if(item.title.length<3||!/^\d{4}-\d{2}-\d{2}$/.test(item.startDate)||!/^\d{4}-\d{2}-\d{2}$/.test(item.endDate)||item.endDate<item.startDate)return null;
  return item;
}

async function admin(request,sql){
  const user=await authenticatedUser(request,sql);
  return user?.role==='admin'?user:null;
}

const validId=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''));

export async function GET(){
  try{
    const sql=database();
    await ensureAppSchema(sql);
    const events=await sql`SELECT id, title, description, start_date::text AS "startDate", end_date::text AS "endDate", time_label AS "timeLabel", location FROM agenda_events ORDER BY start_date, title`;
    return json({events});
  }catch(error){
    console.error('events_get_failed',error instanceof Error?error.message:error);
    return json({message:'Não foi possível carregar a programação.'},500);
  }
}

export async function POST(request){
  try{
    const sql=database();await ensureAppSchema(sql);
    const user=await admin(request,sql);if(!user)return json({message:'Apenas administradores podem alterar a agenda.'},403);
    const item=eventInput(await request.json());if(!item)return json({message:'Revise o título e as datas do evento.'},400);
    const id=randomUUID();
    await sql`INSERT INTO agenda_events (id,title,description,start_date,end_date,time_label,location,created_by) VALUES (${id},${item.title},${item.description},${item.startDate},${item.endDate},${item.timeLabel},${item.location},${user.id})`;
    return json({ok:true,id},201);
  }catch(error){console.error('event_create_failed',error instanceof Error?error.message:error);return json({message:'Não foi possível criar o evento.'},500)}
}

export async function PATCH(request){
  try{
    const sql=database();await ensureAppSchema(sql);
    const user=await admin(request,sql);if(!user)return json({message:'Apenas administradores podem alterar a agenda.'},403);
    const body=await request.json();const id=String(body?.id||'');const item=eventInput(body);
    if(!validId(id)||!item)return json({message:'Revise os dados do evento.'},400);
    await sql`UPDATE agenda_events SET title=${item.title},description=${item.description},start_date=${item.startDate},end_date=${item.endDate},time_label=${item.timeLabel},location=${item.location},updated_at=NOW() WHERE id=${id}`;
    return json({ok:true});
  }catch(error){console.error('event_update_failed',error instanceof Error?error.message:error);return json({message:'Não foi possível atualizar o evento.'},500)}
}

export async function DELETE(request){
  try{
    const sql=database();await ensureAppSchema(sql);
    const user=await admin(request,sql);if(!user)return json({message:'Apenas administradores podem alterar a agenda.'},403);
    const {id}=await request.json();if(!validId(id))return json({message:'Evento não informado.'},400);
    await sql`DELETE FROM agenda_events WHERE id=${String(id)}`;
    return json({ok:true});
  }catch(error){console.error('event_delete_failed',error instanceof Error?error.message:error);return json({message:'Não foi possível excluir o evento.'},500)}
}
