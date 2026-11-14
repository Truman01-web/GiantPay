import type { FastifyReply,FastifyRequest } from 'fastify';
import type { Db } from '../db.js';
import { apiError } from '../security.js';
import { isOperationalControlActive } from './routes.js';

export const operationalControlGuard=(db:Db,controlKey:string)=>async(r:FastifyRequest,p:FastifyReply)=>{
 try{if(await isOperationalControlActive(db,controlKey))return p.code(503).send(apiError(r,'OPERATIONAL_CONTROL_ACTIVE','This operation is temporarily paused by an approved operational control.'));}
 catch{return p.code(503).send(apiError(r,'OPERATIONAL_CONTROL_UNAVAILABLE','Operational control state could not be verified.'));}
};
export const workerAllowed=async(db:Db,controlKey:string)=>{try{return !(await isOperationalControlActive(db,controlKey));}catch{return false;}};
