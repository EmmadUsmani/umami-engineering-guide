import { pg, ch } from './channel.mjs';
// revenue PG variant (getRevenueMetrics.ts:207-243): prefix ilike '%cp%'…; referrer_domain/url_query coalesced to ''
const or = (...v) => v.some(x => x === true) ? true : v.some(x => x === null) ? null : false;
const il = (c, s) => c == null ? null : c.toLowerCase().includes(s);
export function rev(r) {
  const rr = { ...r, referrer_domain: r.referrer_domain ?? '', url_query: r.url_query ?? '' };
  const base = pg(rr);
  const prefix = or(il(r.utm_medium,'cp'), il(r.utm_medium,'ppc'), il(r.utm_medium,'retargeting'), il(r.utm_medium,'paid')) === true ? 'paid' : 'organic';
  return { ...base, prefix, x: base.x.replace(/^(paid|organic)(?=[A-Z])/, prefix) };
}
const UTM = 'utm_source=newsletter&utm_medium=email&utm_campaign=launch&gclid=abc123';
const H = 'example.test';
const rows = {
  alice: { referrer_domain:'google.com', url_query:UTM, utm_source:'newsletter', utm_medium:'email', hostname:H },
  bob: { referrer_domain:'t.co', url_query:'', utm_source:null, utm_medium:null, hostname:H },
  carol: { referrer_domain:null, url_query:'', utm_source:null, utm_medium:null, hostname:H },
  dave: { referrer_domain:'bing.com', url_query:UTM, utm_source:'newsletter', utm_medium:'email', hostname:H },
  frank: { referrer_domain:'github.com', url_query:'', utm_source:null, utm_medium:null, hostname:H },
  'seed google/cpc': { referrer_domain:'google.com', url_query:null, utm_source:'google', utm_medium:'cpc', hostname:'blog.example.com' },
  'seed producthunt': { referrer_domain:'producthunt.com', url_query:null, utm_source:null, utm_medium:null, hostname:'blog.example.com' },
  'seed newsletter/email': { referrer_domain:null, url_query:null, utm_source:'newsletter', utm_medium:'email', hostname:'blog.example.com' },
};
const f = x => x || 'direct';
for (const [k, r] of Object.entries(rows)) { const a = pg(r), b = rev(r), c = ch(r); console.log(k.padEnd(22), 'chanPG', (f(a.x)+' #'+a.branch).padEnd(20), 'revPG', (f(b.x)+' #'+b.branch).padEnd(20), 'CH', f(c.x)+' #'+c.branch); }
