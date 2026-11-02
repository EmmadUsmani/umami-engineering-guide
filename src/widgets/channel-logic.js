// Browser-safe port of the channel CASE (three copies × two backends in target-src).
// variant: 'chanPg' = getChannelMetrics / getChannelExpandedMetrics, Postgres
//          'chanCh' = the same reports, ClickHouse (non-Nullable String columns)
//          'revPg'  = getRevenueMetrics, Postgres
//          'revCh'  = getRevenueMetrics, ClickHouse
var LISTS = {
  SOCIAL: ['bsky.app','facebook.com','fb.com','ig.com','instagram.com','linkedin.','news.ycombinator.com','pinterest.','reddit.','snapchat.','t.co','threads.net','tiktok.','twitter.com','x.com'],
  SEARCH: ['baidu.com','bing.com','duckduckgo.com','ecosia.org','google.','msn.com','search.brave.com','yandex.'],
  LLM: ['chatgpt.com','claude.ai','copilot.microsoft.com','gemini.google.com','meta.ai','perplexity.ai'],
  SHOPPING: ['alibaba.com','aliexpress.com','amazon.','bestbuy.com','ebay.com','etsy.com','newegg.com','target.com','walmart.com'],
  EMAIL: ['gmail.','hotmail.','mail.yahoo.','outlook.','proton.me','protonmail.'],
  VIDEO: ['twitch.','youtube.'],
  PAID: ['ad_id=','aid=','dclid=','epik=','gclid=','li_fat_id=','msclkid=','ob_click_id=','pc_id=','rdt_cid=','scid=','ttclid=','twclid=','utm_medium=cpc','utm_medium=paid','utm_medium=paid_social','utm_source=google']
};
function classifyChannel(row, variant) {
  // SQL three-valued logic: true / false / null (UNKNOWN). A CASE branch fires only on true.
  function or() { var a = [].slice.call(arguments); return a.indexOf(true) >= 0 ? true : a.indexOf(null) >= 0 ? null : false; }
  function and() { var a = [].slice.call(arguments); return a.indexOf(false) >= 0 ? false : a.indexOf(null) >= 0 ? null : true; }
  function eq(a, b) { return a == null || b == null ? null : a === b; }
  function ne(a, b) { return a == null || b == null ? null : a !== b; }
  function ilike(col, s) { return col == null ? null : col.toLowerCase().indexOf(s.toLowerCase()) >= 0; }
  function anyIlike(col, arr) { return or.apply(null, arr.map(function (s) { return ilike(col, s); })); }
  function likeCs(col, s) { return col == null ? null : col.indexOf(s) >= 0; }
  function startsCs(col, s) { return col == null ? null : col.indexOf(s) === 0; }

  var r = { referrer_domain: row.referrer_domain, url_query: row.url_query, utm_medium: row.utm_medium, utm_source: row.utm_source, hostname: row.hostname };
  var prefixRule, prefixTrue, hostCmp;
  var isCh = variant === 'chanCh' || variant === 'revCh';
  var isRev = variant === 'revPg' || variant === 'revCh';
  if (isCh) {
    Object.keys(r).forEach(function (k) { if (r[k] == null) r[k] = ''; });
    prefixRule = "multiSearchAny(lower(utm_medium), ['cp','ppc','retargeting','paid'])";
    prefixTrue = or(ilike(r.utm_medium, 'cp'), ilike(r.utm_medium, 'ppc'), ilike(r.utm_medium, 'retargeting'), ilike(r.utm_medium, 'paid'));
    hostCmp = r.hostname;
  } else if (variant === 'revPg') {
    if (r.referrer_domain == null) r.referrer_domain = '';
    if (r.url_query == null) r.url_query = '';
    prefixRule = "utm_medium ilike '%cp%' OR '%ppc%' OR '%retargeting%' OR '%paid%'";
    prefixTrue = or(ilike(r.utm_medium, 'cp'), ilike(r.utm_medium, 'ppc'), ilike(r.utm_medium, 'retargeting'), ilike(r.utm_medium, 'paid'));
    hostCmp = r.hostname == null ? null : r.hostname.replace(/^www./, '');
  } else {
    prefixRule = "utm_medium LIKE 'p%' OR LIKE '%ppc%' OR '%retargeting%' OR '%paid%' (case-sensitive)";
    prefixTrue = or(startsCs(r.utm_medium, 'p'), likeCs(r.utm_medium, 'ppc'), likeCs(r.utm_medium, 'retargeting'), likeCs(r.utm_medium, 'paid'));
    hostCmp = r.hostname == null ? null : r.hostname.replace(/^www./, '');
  }
  var prefix = prefixTrue === true ? 'paid' : 'organic';
  var L = LISTS;
  var branches = [
    ['direct', and(eq(r.referrer_domain, ''), eq(r.url_query, '')), "referrer_domain = '' and url_query = ''"],
    ['paidAds', anyIlike(r.url_query, L.PAID), 'url_query contains a PAID_AD_PARAMS entry'],
    ['referral', anyIlike(r.utm_medium, ['referral', 'app', 'link']), "utm_medium contains referral | app | link"],
    ['affiliate', ilike(r.utm_medium, 'affiliate'), 'utm_medium contains affiliate'],
    ['sms', or(ilike(r.utm_medium, 'sms'), ilike(r.utm_source, 'sms')), 'utm_medium or utm_source contains sms'],
    ['llm', anyIlike(r.referrer_domain, L.LLM), 'referrer_domain contains an LLM_DOMAINS entry'],
    [prefix + 'Search', or(anyIlike(r.referrer_domain, L.SEARCH), ilike(r.utm_medium, 'organic')), 'SEARCH_DOMAINS or utm_medium contains organic'],
    [prefix + 'Social', anyIlike(r.referrer_domain, L.SOCIAL), 'referrer_domain contains a SOCIAL_DOMAINS entry'],
    ['email', or(anyIlike(r.referrer_domain, L.EMAIL), ilike(r.utm_medium, 'mail')), 'EMAIL_DOMAINS or utm_medium contains mail'],
    [prefix + 'Shopping', or(anyIlike(r.referrer_domain, L.SHOPPING), ilike(r.utm_medium, 'shop')), 'SHOPPING_DOMAINS or utm_medium contains shop'],
    [prefix + 'Video', or(anyIlike(r.referrer_domain, L.VIDEO), ilike(r.utm_medium, 'video')), 'VIDEO_DOMAINS or utm_medium contains video'],
    ['referral', and(ne(r.referrer_domain, hostCmp), ne(r.referrer_domain, '')), 'referrer_domain is another non-empty host'],
  ];
  var unknown = [];
  var evals = branches.map(function (b) { return b[1]; });
  for (var i = 0; i < branches.length; i++) {
    if (branches[i][1] === true) {
      return { channel: branches[i][0], branch: i + 1, why: branches[i][2], prefix: prefix, prefixRule: prefixRule, unknown: unknown, evals: evals, fallback: false };
    }
    if (branches[i][1] === null) unknown.push(i + 1);
  }
  if (isRev) return { channel: 'Unknown', branch: 0, why: "no WHEN was true → ELSE 'Unknown'", prefix: prefix, prefixRule: prefixRule, unknown: unknown, evals: evals, fallback: true };
  return { channel: 'direct', branch: 0, why: "no WHEN was true → x = '' → coalesce(nullif(x, ''), 'direct')", prefix: prefix, prefixRule: prefixRule, unknown: unknown, evals: evals, fallback: true };
}
