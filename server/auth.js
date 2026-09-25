import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const COOKIE_NAME='fonte_session';
const SESSION_SECONDS=60*60*8;

export function database(){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL_NOT_CONFIGURED');
  return neon(process.env.DATABASE_URL);
}

export async function ensureUsersTable(sql){
  await sql`CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY,
    login TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'partner',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export async function ensureAppSchema(sql){
  await ensureUsersTable(sql);
  await sql`CREATE TABLE IF NOT EXISTS partner_profiles (
    user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    niche TEXT NOT NULL DEFAULT '',
    logo_data TEXT,
    whatsapp TEXT NOT NULL DEFAULT '',
    instagram_url TEXT NOT NULL DEFAULT '',
    website_url TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE partner_profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE partner_profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE partner_profiles ADD COLUMN IF NOT EXISTS website_url TEXT NOT NULL DEFAULT ''`;
  await sql`CREATE TABLE IF NOT EXISTS agenda_events (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    time_label TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS partner_testimonials (
    user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES agenda_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    source TEXT NOT NULL DEFAULT 'public',
    company_name TEXT NOT NULL,
    industry TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    email TEXT NOT NULL,
    attendee_names JSONB NOT NULL DEFAULT '[]'::jsonb,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_event_email_unique ON event_registrations(event_id, LOWER(email))`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_event_whatsapp_unique ON event_registrations(event_id, whatsapp)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_event_user_unique ON event_registrations(event_id, user_id) WHERE user_id IS NOT NULL`;
}

export function hashPassword(password){
  const salt=randomBytes(16).toString('hex');
  const hash=scryptSync(password,salt,64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password,stored){
  const [algorithm,salt,expected]=String(stored||'').split('$');
  if(algorithm!=='scrypt'||!salt||!expected)return false;
  const actual=scryptSync(password,salt,64);
  const expectedBuffer=Buffer.from(expected,'hex');
  return actual.length===expectedBuffer.length&&timingSafeEqual(actual,expectedBuffer);
}

function secret(){
  const value=process.env.SESSION_SECRET;
  if(!value||value.length<32)throw new Error('SESSION_SECRET_NOT_CONFIGURED');
  return value;
}

function signature(value){return createHmac('sha256',secret()).update(value).digest('base64url')}

export function createSession(user){
  const payload=Buffer.from(JSON.stringify({sub:user.id,login:user.login,role:user.role,exp:Math.floor(Date.now()/1000)+SESSION_SECONDS})).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function readSession(request){
  const cookie=request.headers.get('cookie')||'';
  const raw=cookie.split(';').map(item=>item.trim()).find(item=>item.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length+1);
  if(!raw)return null;
  const [payload,sig]=raw.split('.');
  if(!payload||!sig)return null;
  const expected=signature(payload);
  const left=Buffer.from(sig);const right=Buffer.from(expected);
  if(left.length!==right.length||!timingSafeEqual(left,right))return null;
  try{const session=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));return session.exp>Date.now()/1000?session:null}catch{return null}
}

export async function authenticatedUser(request,sql){
  const session=readSession(request);
  if(!session)return null;
  const [user]=await sql`SELECT id, login, email, role, active FROM app_users WHERE id=${session.sub} LIMIT 1`;
  return user?.active?user:null;
}

export function sessionCookie(token){return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`}
export function clearSessionCookie(){return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`}

export function json(data,status=200,headers={}){
  return Response.json(data,{status,headers:{'cache-control':'no-store',...headers}});
}
