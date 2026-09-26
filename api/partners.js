import { authenticatedUser, database, ensureAppSchema, json } from '../server/auth.js';

export async function GET(request){
  try{
    const sql=database();await ensureAppSchema(sql);
    const user=await authenticatedUser(request,sql);
    if(user?.role!=='admin')return json({message:'Acesso restrito ao administrador.'},403);
    const partners=await sql`SELECT p.user_id AS id,p.company_name AS "companyName",p.niche,p.logo_data AS "logoData",p.full_name AS "fullName",p.cnpj,COALESCE(NULLIF(p.contact_email,''),u.email,'') AS email,p.whatsapp,p.instagram_url AS "instagramUrl",p.website_url AS "websiteUrl",u.login,u.active FROM partner_profiles p JOIN app_users u ON u.id=p.user_id WHERE u.role='partner' ORDER BY p.company_name`;
    return json({partners});
  }catch(error){
    console.error('partners_admin_get_failed',error instanceof Error?error.message:error);
    return json({message:'Não foi possível carregar os parceiros.'},500);
  }
}
