// Port of the channel CASE in target-src/src/queries/sql/getChannelMetrics.ts (both branches),
// with SQL three-valued logic (null = UNKNOWN) for the Postgres side. Lists copied from src/lib/constants.ts.
const SOCIAL=['bsky.app','facebook.com','fb.com','ig.com','instagram.com','linkedin.','news.ycombinator.com','pinterest.','reddit.','snapchat.','t.co','threads.net','tiktok.','twitter.com','x.com'];
const SEARCH=['baidu.com','bing.com','duckduckgo.com','ecosia.org','google.','msn.com','search.brave.com','yandex.'];
const LLM=['chatgpt.com','claude.ai','copilot.microsoft.com','gemini.google.com','meta.ai','perplexity.ai'];
const SHOP=['alibaba.com','aliexpress.com','amazon.','bestbuy.com','ebay.com','etsy.com','newegg.com','target.com','walmart.com'];
const EMAIL=['gmail.','hotmail.','mail.yahoo.','outlook.','proton.me','protonmail.'];
const VIDEO=['twitch.','youtube.'];
const PAID=['ad_id=','aid=','dclid=','epik=','gclid=','li_fat_id=','msclkid=','ob_click_id=','pc_id=','rdt_cid=','scid=','ttclid=','twclid=','utm_medium=cpc','utm_medium=paid','utm_medium=paid_social','utm_source=google'];
// 3VL helpers: true / false / null
const or = (...v) => v.some(x => x === true) ? true : v.some(x => x === null) ? null : false;
const and = (...v) => v.some(x => x === false) ? false : v.some(x => x === null) ? null : true;
const eq = (a, b) => a == null || b == null ? null : a === b;
const ne = (a, b) => a == null || b == null ? null : a !== b;
const ilikeSub = (col, s) => col == null ? null : col.toLowerCase().includes(s.toLowerCase());
const likeStart = (col, s) => col == null ? null : col.startsWith(s);
const likeSub = (col, s) => col == null ? null : col.includes(s);
const anyIlike = (col, arr) => or(...arr.map(s => ilikeSub(col, s)));

export function pg(r) {
  const prefix = or(likeStart(r.utm_medium,'p'), likeSub(r.utm_medium,'ppc'), likeSub(r.utm_medium,'retargeting'), likeSub(r.utm_medium,'paid')) === true ? 'paid' : 'organic';
  const host = r.hostname == null ? null : r.hostname.replace(/^www./, '');
  const b = [
    ['direct', and(eq(r.referrer_domain,''), eq(r.url_query,''))],
    ['paidAds', anyIlike(r.url_query, PAID)],
    ['referral', anyIlike(r.utm_medium, ['referral','app','link'])],
    ['affiliate', ilikeSub(r.utm_medium,'affiliate')],
    ['sms', or(ilikeSub(r.utm_medium,'sms'), ilikeSub(r.utm_source,'sms'))],
    ['llm', anyIlike(r.referrer_domain, LLM)],
    [prefix+'Search', or(anyIlike(r.referrer_domain, SEARCH), ilikeSub(r.utm_medium,'organic'))],
    [prefix+'Social', anyIlike(r.referrer_domain, SOCIAL)],
    ['email', or(anyIlike(r.referrer_domain, EMAIL), ilikeSub(r.utm_medium,'mail'))],
    [prefix+'Shopping', or(anyIlike(r.referrer_domain, SHOP), ilikeSub(r.utm_medium,'shop'))],
    [prefix+'Video', or(anyIlike(r.referrer_domain, VIDEO), ilikeSub(r.utm_medium,'video'))],
    ['referral', and(ne(r.referrer_domain, host), ne(r.referrer_domain, ''))],
  ];
  const i = b.findIndex(([, c]) => c === true);
  return { prefix, x: i < 0 ? '' : b[i][0], branch: i < 0 ? 'else' : i + 1 };
}
export function ch(r0) {
  const r = Object.fromEntries(Object.entries(r0).map(([k, v]) => [k, v == null ? '' : v])); // non-Nullable String columns
  const lo = s => s.toLowerCase();
  const any = (col, arr) => arr.some(s => lo(col).includes(s));
  const prefix = any(r.utm_medium, ['cp','ppc','retargeting','paid']) ? 'paid' : 'organic';
  const b = [
    ['direct', r.referrer_domain === '' && r.url_query === ''],
    ['paidAds', any(r.url_query, PAID)],
    ['referral', any(r.utm_medium, ['referral','app','link'])],
    ['affiliate', lo(r.utm_medium).includes('affiliate')],
    ['sms', lo(r.utm_medium).includes('sms') || lo(r.utm_source).includes('sms')],
    ['llm', any(r.referrer_domain, LLM)],
    [prefix+'Search', any(r.referrer_domain, SEARCH) || lo(r.utm_medium).includes('organic')],
    [prefix+'Social', any(r.referrer_domain, SOCIAL)],
    ['email', any(r.referrer_domain, EMAIL) || lo(r.utm_medium).includes('mail')],
    [prefix+'Shopping', any(r.referrer_domain, SHOP) || lo(r.utm_medium).includes('shop')],
    [prefix+'Video', any(r.referrer_domain, VIDEO) || lo(r.utm_medium).includes('video')],
    ['referral', r.referrer_domain !== r.hostname && r.referrer_domain !== ''],
  ];
  const i = b.findIndex(([, c]) => c);
  return { prefix, x: i < 0 ? '' : b[i][0], branch: i < 0 ? 'else' : i + 1 };
}
const fin = x => x || 'direct';
const rows = {
  'seed paid google/cpc (scripts/seed paidCampaigns[0])': { referrer_domain:'google.com', url_query:null, utm_source:'google', utm_medium:'cpc', hostname:'blog.example.com' },
  'same click via /api/send (url_query from landing URL)': { referrer_domain:'google.com', url_query:'utm_source=google&utm_medium=cpc&utm_campaign=brand_search&utm_content=ad_1&gclid=abc', utm_source:'google', utm_medium:'cpc', hostname:'blog.example.com' },
  'seed facebook/paid_social': { referrer_domain:'facebook.com', url_query:null, utm_source:'facebook', utm_medium:'paid_social', hostname:'blog.example.com' },
  'seed linkedin/cpc no domain': { referrer_domain:null, url_query:null, utm_source:'linkedin', utm_medium:'cpc', hostname:'blog.example.com' },
  'seed newsletter/email': { referrer_domain:null, url_query:null, utm_source:'newsletter', utm_medium:'email', hostname:'blog.example.com' },
  'seed organic google': { referrer_domain:'google.com', url_query:null, utm_source:null, utm_medium:null, hostname:'blog.example.com' },
  'seed direct': { referrer_domain:null, url_query:null, utm_source:null, utm_medium:null, hostname:'blog.example.com' },
  'medium=partner (PG p%)': { referrer_domain:'google.com', url_query:'', utm_source:'x', utm_medium:'partner', hostname:'a.com' },
  'medium=Paid capital': { referrer_domain:'google.com', url_query:'', utm_source:'x', utm_medium:'Paid', hostname:'a.com' },
};
for (const [k, r] of Object.entries(rows)) { const p = pg(r), c = ch(r); console.log(k.padEnd(56), 'PG', fin(p.x).padEnd(14), `#${p.branch}`, '| CH', fin(c.x).padEnd(14), `#${c.branch}`); }
