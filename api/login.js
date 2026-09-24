import { randomUUID } from 'node:crypto';
import { createSession, database, ensureUsersTable, hashPassword, json, sessionCookie, verifyPassword } from '../server/auth.js';

export async function POST(request){
  try{
    const body=await request.json();
    const login=String(body?.login||'').trim().toLowerCase();
    const password=String(body?.password||'');
    if(!login||!password)return json({message:'Informe o usuário e a senha.'},400);

    const sql=database();
    await ensureUsersTable(sql);
    let [user]=await sql`SELECT id, login, password_hash, role, active FROM app_users WHERE LOWER(login)=LOWER(${login}) OR LOWER(email)=LOWER(${login}) LIMIT 1`;

    const adminLogin=String(process.env.ADMIN_USERNAME||'admin_fonte').trim().toLowerCase();
    if(!user&&login===adminLogin&&process.env.ADMIN_PASSWORD&&password===process.env.ADMIN_PASSWORD){
      const id=randomUUID();
      const passwordHash=hashPassword(password);
      await sql`INSERT INTO app_users (id, login, password_hash, role) VALUES (${id}, ${adminLogin}, ${passwordHash}, 'admin') ON CONFLICT (login) DO NOTHING`;
      [user]=await sql`SELECT id, login, password_hash, role, active FROM app_users WHERE LOWER(login)=LOWER(${adminLogin}) LIMIT 1`;
    }

    if(!user||!user.active||!verifyPassword(password,user.password_hash))return json({message:'Usuário ou senha inválidos.'},401);
    const token=createSession(user);
    return json({ok:true,user:{login:user.login,role:user.role}},200,{'set-cookie':sessionCookie(token)});
  }catch(error){
    console.error('login_failed',error instanceof Error?error.message:error);
    const configurationError=String(error?.message||'').endsWith('_NOT_CONFIGURED');
    return json({message:configurationError?'O acesso ainda está sendo configurado. Tente novamente em breve.':'Não foi possível entrar agora.'},configurationError?503:500);
  }
}

export function GET(){return json({message:'Método não permitido.'},405,{'allow':'POST'})}
