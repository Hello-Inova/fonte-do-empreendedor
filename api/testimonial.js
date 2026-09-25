import { authenticatedUser, database, ensureAppSchema, json } from '../server/auth.js';

export async function GET(request){
  try{
    const sql=database();await ensureAppSchema(sql);
    const user=await authenticatedUser(request,sql);
    if(!user)return json({message:'Sessão não encontrada.'},401);
    if(user.role!=='partner')return json({testimonial:{content:''}});
    const [testimonial]=await sql`SELECT content FROM partner_testimonials WHERE user_id=${user.id} LIMIT 1`;
    return json({testimonial:testimonial||{content:''}});
  }catch(error){console.error('testimonial_get_failed',error instanceof Error?error.message:error);return json({message:'Não foi possível carregar o depoimento.'},500)}
}

export async function POST(request){
  try{
    const sql=database();await ensureAppSchema(sql);
    const user=await authenticatedUser(request,sql);
    if(!user)return json({message:'Sessão não encontrada.'},401);
    if(user.role!=='partner')return json({message:'Somente parceiros podem publicar depoimentos.'},403);
    const body=await request.json();const content=String(body?.content||'').trim().slice(0,700);
    if(content.length<20)return json({message:'Escreva um depoimento com pelo menos 20 caracteres.'},400);
    await sql`INSERT INTO partner_testimonials (user_id,content) VALUES (${user.id},${content}) ON CONFLICT (user_id) DO UPDATE SET content=EXCLUDED.content,updated_at=NOW()`;
    return json({ok:true,message:'Depoimento publicado com sucesso.'});
  }catch(error){console.error('testimonial_save_failed',error instanceof Error?error.message:error);return json({message:'Não foi possível publicar o depoimento.'},500)}
}
