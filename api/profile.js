import { authenticatedUser, database, ensureAppSchema, json } from '../server/auth.js';

const allowedLogo=/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i;
const normalizeWhatsapp=value=>String(value||'').replace(/\D/g,'').slice(0,15);
const normalizeCnpj=value=>String(value||'').replace(/\D/g,'').slice(0,14);
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validCnpj(value){
  const digits=normalizeCnpj(value);if(digits.length!==14||/^(\d)\1+$/.test(digits))return false;
  const check=(length,weights)=>{const sum=digits.slice(0,length).split('').reduce((total,digit,index)=>total+Number(digit)*weights[index],0);const result=sum%11;return result<2?0:11-result};
  return check(12,[5,4,3,2,9,8,7,6,5,4,3,2])===Number(digits[12])&&check(13,[6,5,4,3,2,9,8,7,6,5,4,3,2])===Number(digits[13]);
}
function normalizeLink(value,instagram=false){
  const raw=String(value||'').trim();if(!raw)return '';
  try{const url=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);if(!['http:','https:'].includes(url.protocol))return '';if(instagram&&!/(^|\.)instagram\.com$/i.test(url.hostname))return '';return url.toString().slice(0,300)}catch{return ''}
}

export async function GET(request){
  try{
    const sql=database();
    await ensureAppSchema(sql);
    const user=await authenticatedUser(request,sql);
    if(!user)return json({message:'Sessão não encontrada.'},401);
    const [profile]=await sql`SELECT p.company_name, p.niche, p.logo_data, p.whatsapp, p.instagram_url, p.website_url, p.full_name, p.cnpj, COALESCE(NULLIF(p.contact_email,''),u.email,'') AS contact_email FROM partner_profiles p JOIN app_users u ON u.id=p.user_id WHERE p.user_id=${user.id} LIMIT 1`;
    return json({profile:profile||{company_name:'',niche:'',logo_data:null,whatsapp:'',instagram_url:'',website_url:'',full_name:'',cnpj:'',contact_email:user.email||''}});
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
    const fullName=String(body?.fullName||'').trim().replace(/\s+/g,' ').slice(0,120);
    const cnpj=normalizeCnpj(body?.cnpj);
    const contactEmail=String(body?.email||'').trim().toLowerCase().slice(0,180);
    const logoData=body?.logoData==null?null:String(body.logoData);
    const whatsapp=normalizeWhatsapp(body?.whatsapp);
    const instagramUrl=normalizeLink(body?.instagramUrl,true);
    const websiteUrl=normalizeLink(body?.websiteUrl);
    if(companyName.length<2)return json({message:'Informe o nome da empresa.'},400);
    if(fullName.length<3)return json({message:'Informe o nome completo do responsável.'},400);
    if(!validCnpj(cnpj))return json({message:'Informe um CNPJ válido.'},400);
    if(!emailPattern.test(contactEmail))return json({message:'Informe um e-mail válido.'},400);
    if(logoData&&(!allowedLogo.test(logoData)||logoData.length>750000))return json({message:'Envie um logo PNG, JPG ou WebP de até 500 KB.'},400);
    if(body?.whatsapp&&whatsapp.length<10)return json({message:'Informe o WhatsApp com DDD e código do país.'},400);
    if(body?.instagramUrl&&!instagramUrl)return json({message:'Informe um link válido do Instagram.'},400);
    if(body?.websiteUrl&&!websiteUrl)return json({message:'Informe um link válido do site.'},400);
    await sql`INSERT INTO partner_profiles (user_id, company_name, niche, logo_data, whatsapp, instagram_url, website_url, full_name, cnpj, contact_email)
      VALUES (${user.id}, ${companyName}, ${niche}, ${logoData}, ${whatsapp}, ${instagramUrl}, ${websiteUrl}, ${fullName}, ${cnpj}, ${contactEmail})
      ON CONFLICT (user_id) DO UPDATE SET company_name=EXCLUDED.company_name, niche=EXCLUDED.niche,
      logo_data=COALESCE(EXCLUDED.logo_data,partner_profiles.logo_data), whatsapp=EXCLUDED.whatsapp,
      instagram_url=EXCLUDED.instagram_url, website_url=EXCLUDED.website_url, full_name=EXCLUDED.full_name,
      cnpj=EXCLUDED.cnpj, contact_email=EXCLUDED.contact_email, updated_at=NOW()`;
    return json({ok:true,message:'Perfil atualizado com sucesso.'});
  }catch(error){
    console.error('profile_save_failed',error instanceof Error?error.message:error);
    return json({message:'Não foi possível salvar o perfil.'},500);
  }
}
