import { clearSessionCookie, json } from '../server/auth.js';

export function POST(){return json({ok:true},200,{'set-cookie':clearSessionCookie()})}
export function GET(){return json({message:'Método não permitido.'},405,{'allow':'POST'})}
