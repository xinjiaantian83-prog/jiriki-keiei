import {cpSync,existsSync,mkdirSync,readdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {basename,dirname,join,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const dist=join(root,'dist');
const domain='https://jiriki-keiei.com';
const siteName='現場屋の自力経営';
const subtitle='下請けに頼り切らず、自分で仕事を取れる状態を作るまでの実録';

const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const inline=value=>escapeHtml(value).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`(.+?)`/g,'<code>$1</code>');

function parseFile(file){
  const raw=readFileSync(file,'utf8');
  const match=raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if(!match)throw new Error(`Front matter not found: ${file}`);
  const meta={};
  for(const line of match[1].split('\n')){
    const index=line.indexOf(':');
    if(index<0)continue;
    const key=line.slice(0,index).trim();
    let value=line.slice(index+1).trim();
    if(value==='true'||value==='false')value=value==='true';
    meta[key]=value;
  }
  return{...meta,slug:basename(file,'.md'),body:match[2].trim()};
}

function markdown(source){
  const lines=source.split('\n');
  const out=[];
  let paragraph=[];
  let list=false;
  const flush=()=>{if(paragraph.length){out.push(`<p>${inline(paragraph.join(' '))}</p>`);paragraph=[]}};
  for(const line of lines){
    if(line.startsWith('- ')){
      flush();
      if(!list){out.push('<ul>');list=true}
      out.push(`<li>${inline(line.slice(2))}</li>`);continue;
    }
    if(list){out.push('</ul>');list=false}
    if(!line.trim()){flush();continue}
    if(line.startsWith('### ')){flush();out.push(`<h3>${inline(line.slice(4))}</h3>`);continue}
    if(line.startsWith('## ')){flush();out.push(`<h2>${inline(line.slice(3))}</h2>`);continue}
    if(line.startsWith('> ')){flush();out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);continue}
    paragraph.push(line.trim());
  }
  if(list)out.push('</ul>');
  flush();
  return out.join('\n');
}

const formatDate=date=>new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Tokyo'}).format(new Date(`${date}T00:00:00+09:00`));
const articleUrl=article=>`${domain}/articles/${article.slug}/`;

function head({title,description,path='/',type='website',assetPrefix=''}){
  const url=`${domain}${path}`;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(description)}"><meta name="theme-color" content="#33483a"><link rel="icon" href="${assetPrefix}favicon.svg" type="image/svg+xml"><link rel="canonical" href="${url}"><meta property="og:type" content="${type}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${url}"><meta property="og:site_name" content="${siteName}"><meta name="twitter:card" content="summary"><title>${escapeHtml(title)}</title><link rel="stylesheet" href="${assetPrefix}styles.css"></head>`;
}

const header=prefix=>`<header class="site-header"><div class="wrap header-inner"><a class="brand" href="${prefix}" aria-label="${siteName}トップへ"><span class="brand-mark">自</span><span>${siteName}<small>FIELD NOTES ON INDEPENDENT BUSINESS</small></span></a><nav class="site-nav" data-nav aria-label="メインメニュー"><a href="${prefix}#about">このブログについて</a><a href="${prefix}#articles">記事を読む</a><a href="${prefix}about/">運営方針</a><a href="${prefix}contact/">お問い合わせ</a></nav><button class="menu" data-menu type="button" aria-label="メニューを開く" aria-expanded="false"><span></span><span></span></button></div></header>`;
const footer=prefix=>`<footer class="site-footer"><div class="wrap footer-main"><a class="brand" href="${prefix}"><span class="brand-mark">自</span><span>${siteName}<small>${subtitle}</small></span></a><div class="footer-links"><a href="${prefix}about/">このブログについて</a><a href="${prefix}privacy/">プライバシーポリシー</a><a href="${prefix}disclaimer/">免責事項</a><a href="${prefix}contact/">お問い合わせ</a></div></div><div class="wrap footer-bottom">© 2026 現場屋の自力経営</div></footer><script src="${prefix}site-config.js"></script><script src="${prefix}site.js"></script></body></html>`;

const articles=readdirSync(join(root,'content/articles')).filter(file=>file.endsWith('.md')).map(file=>parseFile(join(root,'content/articles',file))).sort((a,b)=>b.date.localeCompare(a.date));
const categories=['0円から始めた集客','Google・口コミ','下請け依存と価格','HP・AI','実録・失敗・途中経過'];
const card=article=>`<a class="article-card" href="articles/${article.slug}/"><div class="meta"><span class="tag">${escapeHtml(article.category)}</span><time datetime="${article.date}">${formatDate(article.date)}</time></div><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.description)}</p><span class="read">続きを読む →</span></a>`;

const home=`${head({title:`${siteName}｜${subtitle}`,description:'地方の現場職人が、下請けだけに頼らず自分で仕事を取れる状態を作るまでの実体験、失敗、遠回り、途中経過を記録するブログ。'})}<body>${header('./')}<main><section class="hero"><div class="wrap"><div class="eyebrow">地方の現場職人による実録</div><h1>${siteName}<span>下請け100%だった職人が、HPを公開して約3年。<br>今ではAI検索をきっかけに、問い合わせが来るようになりました。</span></h1><p>特別なことをしたわけではありません。投稿を忘れたり、サボったりもしました。それでも、できる時に少しずつ積み上げてきた実録です。</p></div></section>
<section class="section" id="about"><div class="wrap about-grid"><div class="about-label">下請けを否定したいわけではありません。<br>選べない状態から抜けたいだけです。</div><div class="about-copy"><div class="eyebrow">ABOUT THIS BLOG</div><h2>誰と、いくらで、いつ働くか。<br>少しずつ自分で選べるように。</h2><p>下請けには、営業せず施工へ集中できる良さがあります。ただ、そこしか仕事の入口がないと、価格も日程も仕事量も自分では決めにくくなります。</p><p><strong>「下請けしか選べない状態」から少しずつ抜ける。</strong>このブログが書きたいのは、その途中の話です。</p><p>成功法則ではありません。もっと早い方法もあるかもしれませんが、少なくとも自分が実際にやったこと、失敗したこと、まだ試していることを淡々と残します。</p></div></div></section>
<section class="section alt" id="articles"><div class="wrap"><div class="section-head"><div><div class="eyebrow">START HERE</div><h2>まず読んでほしい5本</h2></div><p>広告費も知識もほとんどないところから始めました。時系列に近い順で読むと、やってきたことの流れが分かります。</p></div><div class="article-grid">${articles.filter(a=>a.featured).map(card).join('')}</div></div></section>
<section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">CATEGORY</div><h2>テーマから読む</h2></div></div><div class="category-list">${categories.map(category=>`<a href="#latest" data-category="${escapeHtml(category)}">${escapeHtml(category)}</a>`).join('')}</div></div></section>
<section class="section alt" id="latest"><div class="wrap"><div class="section-head"><div><div class="eyebrow">LATEST</div><h2>最新記事</h2></div></div><div class="article-grid">${articles.map(card).join('')}</div></div></section>
<section class="section"><div class="wrap progress"><div><div class="eyebrow">IN PROGRESS</div><h2>現在進行形</h2><p>完成した成功談ではなく、今も試していることを記録します。結果が出なかったものも、後から分かる形で残していく予定です。</p></div><div class="progress-box"><p><strong>いま試していること</strong><br>施工写真と地域情報を積み上げたとき、検索やAIからどのように見つけられるか。問い合わせ数だけでなく、相談の内容がどう変わるかも見ています。</p></div></div></section>
<section class="wrap quiet-cta"><div><h2>自分で作る時間がない方へ</h2><p>現場業向けのホームページ制作も行っています。詳しい案内は準備中です。</p></div><a class="text-link" href="#" aria-disabled="true">詳細は準備中</a></section></main>${footer('./')}`;

function articlePage(article,index){
  const previous=articles[index+1];
  const next=articles[index-1];
  const related=articles.filter(item=>item.slug!==article.slug&&item.category===article.category).slice(0,2);
  const fallback=articles.filter(item=>item.slug!==article.slug&&!related.includes(item)).slice(0,2-related.length);
  return `${head({title:`${article.title}｜${siteName}`,description:article.description,path:`/articles/${article.slug}/`,type:'article',assetPrefix:'../../'})}<body>${header('../../')}<main><header class="article-hero"><div class="wrap"><div class="article-meta"><span class="tag">${escapeHtml(article.category)}</span><time datetime="${article.date}">${formatDate(article.date)}</time></div><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.description)}</p></div></header><div class="wrap article-layout"><article class="article-body">${markdown(article.body)}<nav class="post-nav" aria-label="前後の記事">${previous?`<a href="../${previous.slug}/">← 前の記事<br><strong>${escapeHtml(previous.title)}</strong></a>`:'<span></span>'}${next?`<a href="../${next.slug}/">次の記事 →<br><strong>${escapeHtml(next.title)}</strong></a>`:''}</nav><section class="related"><h2>関連記事</h2><div class="related-list">${[...related,...fallback].map(item=>`<a href="../${item.slug}/">${escapeHtml(item.title)}</a>`).join('')}</div></section><a class="back-home" href="../../">トップへ戻る →</a></article><aside class="article-aside"><strong>このブログについて</strong><p>地方の現場職人が、下請けだけに頼らず仕事の入口を作ってきた途中経過を書いています。</p><p>自分でHPを作る時間がない方向けの制作案内も、今後掲載予定です。</p></aside></div></main>${footer('../../')}`;
}

const legalPages={
  about:{title:'このブログについて',description:'現場屋の自力経営の運営方針と、記事を書くうえで大切にしていること。',body:`<h2>このブログの目的</h2><p>下請けそのものを否定するのではなく、「下請けしか選べない状態」から少しずつ抜けるために、自分が実際に行ってきたことを記録します。</p><h2>書く内容</h2><p>地方の施工業者として行った集客、価格の失敗、Googleやホームページの活用、まだ結果が出ていない試みも含めて書きます。誰にでも同じ結果が出る成功法則として紹介するものではありません。</p><h2>匿名で運営する理由</h2><p>個人名、屋号、所在地、取引先など、本人や顧客を特定できる情報は掲載しません。実体験の中身を主役にしながら、関係者のプライバシーを守るためです。</p>`},
  privacy:{title:'プライバシーポリシー',description:'現場屋の自力経営における個人情報とアクセス情報の取り扱い方針。',body:`<h2>取得する情報</h2><p>お問い合わせ時に提供された内容のほか、アクセス解析を導入した場合は、Cookie等を通じて閲覧ページ、利用環境、流入元などの情報を取得する場合があります。</p><h2>利用目的</h2><p>お問い合わせへの回答、サイトの利用状況の把握、記事や導線の改善、不正利用の防止に利用します。</p><h2>アクセス解析</h2><p>今後Google Analyticsを利用する場合があります。Measurement ID未設定時は解析用スクリプトを読み込まず、外部への計測通信は行いません。Cookieはブラウザ設定で無効にできます。</p><h2>第三者提供</h2><p>法令に基づく場合などを除き、本人の同意なく個人情報を第三者へ提供しません。</p><h2>お問い合わせ</h2><p>連絡先は、お問い合わせページで準備が整い次第案内します。</p>`},
  disclaimer:{title:'免責事項',description:'現場屋の自力経営に掲載する情報の性質と免責事項。',body:`<h2>掲載情報について</h2><p>本サイトは運営者個人の経験と見解を記録するもので、特定の方法による売上、集客、利益その他の成果を保証しません。</p><h2>情報の正確性</h2><p>可能な範囲で正確な情報を掲載しますが、制度、サービス仕様、地域事情などは変わる場合があります。実際の判断は必要に応じて専門家や各サービス提供者へご確認ください。</p><h2>損害等の責任</h2><p>本サイトの情報を利用したことで生じた損害について、運営者は法令上認められる範囲で責任を負いません。</p>`},
  contact:{title:'お問い合わせ',description:'現場屋の自力経営へのお問い合わせについて。',body:`<h2>連絡方法は準備中です</h2><p>現在、お問い合わせ窓口を準備しています。個人名や屋号を公開せず、安全に連絡を受けられる方法が整い次第、このページでご案内します。</p><p>記事に登場する顧客、取引先、地域などを特定するお問い合わせには回答できません。</p>`}
};

rmSync(dist,{recursive:true,force:true});
mkdirSync(dist,{recursive:true});
writeFileSync(join(dist,'index.html'),home);
for(const [slug,page] of Object.entries(legalPages)){
  const output=join(dist,slug,'index.html');mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,`${head({title:`${page.title}｜${siteName}`,description:page.description,path:`/${slug}/`,assetPrefix:'../'})}<body>${header('../')}<main class="wrap legal"><div class="eyebrow">INFORMATION</div><h1>${page.title}</h1>${page.body}<a class="back-home" href="../">トップへ戻る →</a></main>${footer('../')}`);
}
for(const [index,article] of articles.entries()){
  const output=join(dist,'articles',article.slug,'index.html');mkdirSync(dirname(output),{recursive:true});writeFileSync(output,articlePage(article,index));
}
for(const file of readdirSync(join(root,'public'))){cpSync(join(root,'public',file),join(dist,file),{recursive:true})}
writeFileSync(join(dist,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${domain}/sitemap.xml\n`);
const urls=['/',...articles.map(a=>`/articles/${a.slug}/`),...Object.keys(legalPages).map(slug=>`/${slug}/`)];
writeFileSync(join(dist,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path=>`\n  <url><loc>${domain}${path}</loc></url>`).join('')}\n</urlset>\n`);
writeFileSync(join(dist,'404.html'),`${head({title:`ページが見つかりません｜${siteName}`,description:'お探しのページは見つかりませんでした。',path:'/404.html'})}<body>${header('./')}<main class="not-found"><div class="eyebrow">404</div><h1>ページが見つかりません</h1><a class="back-home" href="./">トップへ戻る →</a></main>${footer('./')}`);

for(const required of ['index.html','styles.css','site.js','site-config.js','CNAME','robots.txt','sitemap.xml'])if(!existsSync(join(dist,required)))throw new Error(`Missing: ${required}`);
console.log(`Build complete: ${articles.length} articles, ${urls.length} sitemap URLs`);
