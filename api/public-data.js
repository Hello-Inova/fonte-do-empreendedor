import { database, ensureAppSchema, json } from '../server/auth.js';

export async function GET(){
  try{
    const sql=database();
    await ensureAppSchema(sql);
    const [events,partners,testimonials]=await Promise.all([
      sql`SELECT id, title, description, start_date::text AS "startDate", end_date::text AS "endDate", time_label AS "timeLabel", location FROM agenda_events ORDER BY start_date, title`,
      sql`SELECT p.user_id AS id, p.company_name AS "companyName", p.niche, p.logo_data AS "logoData", p.whatsapp, p.instagram_url AS "instagramUrl", p.website_url AS "websiteUrl" FROM partner_profiles p JOIN app_users u ON u.id=p.user_id WHERE u.role='partner' AND u.active=TRUE ORDER BY p.company_name`,
      sql`SELECT t.user_id AS id, t.content, p.company_name AS "companyName", p.niche, p.logo_data AS "logoData" FROM partner_testimonials t JOIN partner_profiles p ON p.user_id=t.user_id JOIN app_users u ON u.id=t.user_id WHERE u.role='partner' AND u.active=TRUE ORDER BY t.updated_at DESC`
    ]);
    return json({events,partners,testimonials});
  }catch(error){
    console.error('public_data_failed',error instanceof Error?error.message:error);
    return json({message:'Não foi possível carregar os dados da comunidade.'},500);
  }
}
