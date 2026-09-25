import { authenticatedUser, database, ensureAppSchema, json } from '../server/auth.js';

export async function GET(request){
  try{
    const sql=database();await ensureAppSchema(sql);
    const user=await authenticatedUser(request,sql);
    if(!user)return json({message:'Sessão não encontrada.'},401);
    return json({user:{id:user.id,login:user.login,email:user.email||'',role:user.role}});
  }catch(error){
    console.error('session_failed',error instanceof Error?error.message:error);
    return json({message:'O serviço de autenticação está indisponível.'},503);
  }
}
