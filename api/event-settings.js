import { authenticatedUser, database, ensureAppSchema, json } from '../server/auth.js';

async function admin(request,sql){const user=await authenticatedUser(request,sql);return user?.role==='admin'?user:null}

export async function GET(request){
  try{const sql=database();await ensureAppSchema(sql);const user=await admin(request,sql);if(!user)return json({message:'Acesso restrito ao administrador.'},403);const [setting]=await sql`SELECT setting_value,updated_at AS "updatedAt" FROM app_settings WHERE setting_key='event_promo_enabled' LIMIT 1`;return json({eventPromoEnabled:setting?.setting_value!=='false',updatedAt:setting?.updatedAt||null})}
  catch(error){console.error('event_settings_get_failed',error instanceof Error?error.message:error);return json({message:'Não foi possível carregar a configuração.'},500)}
}

export async function POST(request){
  try{const sql=database();await ensureAppSchema(sql);const user=await admin(request,sql);if(!user)return json({message:'Acesso restrito ao administrador.'},403);const body=await request.json();if(typeof body?.enabled!=='boolean')return json({message:'Informe se a divulgação deve ficar ativa.'},400);await sql`INSERT INTO app_settings (setting_key,setting_value,updated_by,updated_at) VALUES ('event_promo_enabled',${body.enabled?'true':'false'},${user.id},NOW()) ON CONFLICT (setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_by=EXCLUDED.updated_by,updated_at=NOW()`;return json({ok:true,eventPromoEnabled:body.enabled,message:body.enabled?'Folder e faixa ativados no site.':'Folder e faixa desativados no site.'})}
  catch(error){console.error('event_settings_save_failed',error instanceof Error?error.message:error);return json({message:'Não foi possível salvar a configuração.'},500)}
}
