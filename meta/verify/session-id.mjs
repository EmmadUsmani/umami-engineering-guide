// Re-implements target-src/src/lib/crypto.ts hash/uuid/getSalt + the session/visit derivation
// in target-src/src/app/api/send/route.ts, with fixture inputs from route.test.ts.
import crypto from 'node:crypto';

const hash = (...a) => crypto.createHash('sha512').update(a.join('')).digest('hex');
const DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
function v5(name, ns) {
  const nsb = Buffer.from(ns.replace(/-/g, ''), 'hex');
  const h = crypto.createHash('sha1').update(Buffer.concat([nsb, Buffer.from(name, 'utf8')])).digest();
  const b = h.subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50; b[8] = (b[8] & 0x3f) | 0x80;
  const x = b.toString('hex');
  return `${x.slice(0,8)}-${x.slice(8,12)}-${x.slice(12,16)}-${x.slice(16,20)}-${x.slice(20)}`;
}
// RFC/Python known vector: uuid5(NAMESPACE_DNS, 'python.org')
const vec = v5('python.org', DNS);
console.log('v5 self-check', vec, vec === '886313e1-3b8a-5372-9b90-0c9aee199e5d' ? 'OK' : 'FAIL');

const APP_SECRET = 'route-send-test-secret';
const secret = () => hash(APP_SECRET);
const uuid = (...args) => v5(hash(...args, secret()), DNS);
// date-fns startOf* operate in the process's local time zone
const startOfMonth = d => { const r = new Date(d); r.setDate(1); r.setHours(0,0,0,0); return r; };
const startOfWeek = d => { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r; };
const startOfDay = d => { const r = new Date(d); r.setHours(0,0,0,0); return r; };
const startOfHour = d => { const r = new Date(d); r.setMinutes(0,0,0); return r; };
const getSalt = (rot, d) => hash((rot === 'day' ? startOfDay : rot === 'week' ? startOfWeek : startOfMonth)(d).toUTCString());

const WEBSITE_ID = '11111111-1111-4111-8111-111111111111';
const ip = '203.0.113.5', ua = 'Mozilla/5.0';
const ts = Number(process.argv[2] || 1704067200);
const rot = process.argv[3] || 'month';
const distinct = process.argv[4] || '';
const createdAt = new Date(ts * 1000);
const salt = getSalt(rot, createdAt);
const sessionId = uuid(WEBSITE_ID, ip, ua, salt, distinct);
const visitSalt = hash(startOfHour(createdAt).toUTCString());
const visitId = uuid(sessionId, visitSalt);
console.log(JSON.stringify({ TZ: process.env.TZ, ts, rot, distinct, saltInput: (rot==='day'?startOfDay:rot==='week'?startOfWeek:startOfMonth)(createdAt).toUTCString(), salt: salt.slice(0,16)+'…', sessionId, hourInput: startOfHour(createdAt).toUTCString(), visitId }, null, 1));
