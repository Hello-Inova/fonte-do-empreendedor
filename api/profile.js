import { authenticatedUser, database, ensureAppSchema, json } from '../server/auth.js';

const allowedLogo=/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i;

export async function GET(request){
  try{
    const sql=database();
    await ensureAppSchema(sql);
    const user=await authenticatedUser(request,sql);
    if(!user)return json({message:'Sessão não encontrada.'},401);
    const [profile]=await sql`SELECT company_name, niche, logo_data FROM partner_profiles WHERE user_id=${user.id} LIMIT 1`;
    return json({profile:profile||{company_name:'',niche:'',logo_data:null}});
  }catch(error){
    console.error('profile_get_failed',error instanceof Error?error.message:error);
    return json({message:'Não foi possível carregar o perfil.'},500);
  }
}

export async function POST(request){
  try{
    const sql=database();
    await ensureAppSchema(sql);
    const user=await authenticatedUser(request,sql);
    if(!user)return json({message:'Sessão não encontrada.'},401);
    const body=await request.json();
    const companyName=String(body?.companyName||'').trim().slice(0,100);
    const niche=String(body?.niche||'').trim().slice(0,180);
    const logoData=body?.logoData==null?null:String(body.logoData);
    if(companyName.length<2)return json({message:'Informe o nome da empresa.'},400);
    if(logoData&&(!allowedLogo.test(logoData)||logoData.length>750000))return json({message:'Envie um logo PNG, JPG ou WebP de até 500 KB.'},400);
    await sql`INSERT INTO partner_profiles (user_id, company_name, niche, logo_data)
      VALUES (${user.id}, ${companyName}, ${niche}, ${logoData})
      ON CONFLICT (user_id) DO UPDATE SET company_name=EXCLUDED.company_name, niche=EXCLUDED.niche,
      logo_data=COALESCE(EXCLUDED.logo_data,partner_profiles.logo_data), updated_at=NOW()`;
    return json({ok:true,message:'Perfil atualizado com sucesso.'});
  }catch(error){
    console.error('profile_save_failed',error instanceof Error?error.message:error);
    return json({message:'Não foi possível salvar o perfil.'},500);
  }
}
