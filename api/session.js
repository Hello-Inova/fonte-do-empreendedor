import { json, readSession } from '../server/auth.js';

export function GET(request){
  try{
    const session=readSession(request);
    if(!session)return json({message:'Sessão não encontrada.'},401);
    return json({user:{id:session.sub,login:session.login,role:session.role}});
  }catch(error){
    console.error('session_failed',error instanceof Error?error.message:error);
    return json({message:'O serviço de autenticação está indisponível.'},503);
  }
}
