const fs = require('fs'), vm = require('vm'); const ctx = {}; vm.runInNewContext(fs.readFileSync(__dirname + '/../../src/widgets/channel-logic.js', 'utf8'), ctx); const { classifyChannel } = ctx;
const UTM = 'utm_source=newsletter&utm_medium=email&utm_campaign=launch&gclid=abc123';
const H = 'example.test';
const rows = {
  alice: { referrer_domain:'google.com', url_query:UTM, utm_source:'newsletter', utm_medium:'email', hostname:H },
  bob: { referrer_domain:'t.co', url_query:'', utm_source:null, utm_medium:null, hostname:H },
  carol: { referrer_domain:null, url_query:'', utm_source:null, utm_medium:null, hostname:H },
  frank: { referrer_domain:'github.com', url_query:'', utm_source:null, utm_medium:null, hostname:H },
  'seed google/cpc': { referrer_domain:'google.com', url_query:null, utm_source:'google', utm_medium:'cpc', hostname:'blog.example.com' },
  'seed producthunt': { referrer_domain:'producthunt.com', url_query:null, utm_source:null, utm_medium:null, hostname:'blog.example.com' },
  'no-match other.example': { referrer_domain:'blog.example.com', url_query:'', utm_source:null, utm_medium:null, hostname:'blog.example.com' },
  'seed newsletter/email': { referrer_domain:null, url_query:null, utm_source:'newsletter', utm_medium:'email', hostname:'blog.example.com' },
};
for (const [k, r] of Object.entries(rows)) console.log(k.padEnd(22), ['chanPg','chanCh','revPg','revCh'].map(v => { const o = classifyChannel(r, v); return `${v}=${o.channel}#${o.branch}`; }).join('  '));
