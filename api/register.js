import { randomUUID } from 'node:crypto';
import { createSession, database, ensureAppSchema, hashPassword, json, sessionCookie } from '../server/auth.js';

const loginPattern=/^[a-z0-9._-]{3,40}$/i;

export async function POST(request){
  try{
    const body=await request.json();
    const companyName=String(body?.companyName||'').trim().slice(0,100);
    const niche=String(body?.niche||'').trim().slice(0,180);
    const login=String(body?.login||'').trim().toLowerCase();
    const email=String(body?.email||'').trim().toLowerCase();
    const password=String(body?.password||'');
    if(companyName.length<2)return json({message:'Informe o nome da empresa.'},400);
    if(!loginPattern.test(login))return json({message:'Use de 3 a 40 caracteres no usuário: letras, números, ponto, hífen ou sublinhado.'},400);
    if(!/^\S+@\S+\.\S+$/.test(email))return json({message:'Informe um e-mail válido.'},400);
    if(password.length<8)return json({message:'A senha deve ter pelo menos 8 caracteres.'},400);

    const sql=database();
    await ensureAppSchema(sql);
    const id=randomUUID();
    await sql`INSERT INTO app_users (id, login, email, password_hash, role) VALUES (${id}, ${login}, ${email}, ${hashPassword(password)}, 'partner')`;
    await sql`INSERT INTO partner_profiles (user_id, company_name, niche) VALUES (${id}, ${companyName}, ${niche})`;
    const token=createSession({id,login,role:'partner'});
    return json({ok:true,user:{login,role:'partner'}},201,{'set-cookie':sessionCookie(token)});
  }catch(error){
    console.error('registration_failed',error instanceof Error?error.message:error);
    if(error?.code==='23505')return json({message:'Este usuário ou e-mail já está cadastrado.'},409);
    return json({message:'Não foi possível concluir o cadastro agora.'},500);
  }
}

export function GET(){return json({message:'Método não permitido.'},405,{'allow':'POST'})}
