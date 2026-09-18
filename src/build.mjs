import {cpSync,existsSync,mkdirSync,readdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {basename,dirname,join,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const dist=join(root,'dist');
const domain='https://jiriki-keiei.com';
const siteName='現場屋の自力経営';
const subtitle='下請けに頼り切らず、自分で仕事を取れる状態を作るまでの実録';

const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const inline=value=>escapeHtml(value).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`(.+?)`/g,'<code>$1</code>').replace(/\[([^\]]+)\]\((\/[^)]+)\)/g,'<a href="$2">$1</a>');

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
  let list='';
  const flush=()=>{if(paragraph.length){out.push(`<p>${inline(paragraph.join(' '))}</p>`);paragraph=[]}};
  const closeList=()=>{if(list){out.push('</ul>');list=''}};
  for(const line of lines){
    if(line.startsWith('- ')){
      flush();
      if(list!=='bullet'){closeList();out.push('<ul>');list='bullet'}
      out.push(`<li>${inline(line.slice(2))}</li>`);continue;
    }
    if(line.startsWith('□ ')){
      flush();
      if(list!=='check'){closeList();out.push('<ul class="checklist">');list='check'}
      out.push(`<li>${inline(line.slice(2))}</li>`);continue;
    }
    closeList();
    if(!line.trim()){flush();continue}
    if(line.trim()==='---'){flush();out.push('<hr>');continue}
    if(line.startsWith('#### ')){flush();out.push(`<h4>${inline(line.slice(5))}</h4>`);continue}
    if(line.startsWith('### ')){flush();out.push(`<h3>${inline(line.slice(4))}</h3>`);continue}
    if(line.startsWith('## ')){flush();out.push(`<h2>${inline(line.slice(3))}</h2>`);continue}
    if(line.startsWith('# ')){flush();out.push(`<h2>${inline(line.slice(2))}</h2>`);continue}
    if(line.startsWith('> ')){flush();out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);continue}
    paragraph.push(line.trim());
  }
  closeList();
  flush();
  return out.join('\n');
}

const formatDate=date=>new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Tokyo'}).format(new Date(`${date}T00:00:00+09:00`));
const articleUrl=article=>`${domain}/articles/${article.slug}/`;
const author={
  '@type':'Person',
  name:'現場屋の自力経営 運営者',
  url:`${domain}/about/`,
  jobTitle:'外構・エクステリア現場職人',
  description:'愛媛県松山市周辺で外構・エクステリアとカーポート施工の経験を重ね、下請け中心から直客集客へ移行してきた現役の現場職人。',
  homeLocation:{'@type':'Place',name:'愛媛県松山市周辺'},
  knowsAbout:['外構工事','エクステリア','カーポート施工','現場仕事の直客集客']
};

function head({title,description,path='/',type='website',assetPrefix='',structuredData=null}){
  const url=`${domain}${path}`;
  const schema=structuredData?`<script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g,'\\u003c')}</script>`:'';
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(description)}"><meta name="theme-color" content="#33483a"><link rel="icon" href="${assetPrefix}favicon.svg" type="image/svg+xml"><link rel="canonical" href="${url}"><meta property="og:type" content="${type}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${url}"><meta property="og:site_name" content="${siteName}"><meta name="twitter:card" content="summary"><title>${escapeHtml(title)}</title><link rel="stylesheet" href="${assetPrefix}styles.css">${schema}</head>`;
}

const header=prefix=>`<header class="site-header"><div class="wrap header-inner"><a class="brand" href="${prefix}" aria-label="${siteName}トップへ"><span class="brand-mark">自</span><span>${siteName}<small>FIELD NOTES ON INDEPENDENT BUSINESS</small></span></a><nav class="site-nav" data-nav aria-label="メインメニュー"><a href="${prefix}#about">このブログについて</a><a href="${prefix}#articles">実録を読む</a><a href="${prefix}#guides">実務ガイド</a><a href="${prefix}about/">運営方針</a><a href="${prefix}contact/">お問い合わせ</a></nav><button class="menu" data-menu type="button" aria-label="メニューを開く" aria-expanded="false"><span></span><span></span></button></div></header>`;
const footer=prefix=>`<footer class="site-footer"><div class="wrap footer-main"><a class="brand" href="${prefix}"><span class="brand-mark">自</span><span>${siteName}<small>${subtitle}</small></span></a><div class="footer-links"><a href="${prefix}about/">このブログについて</a><a href="${prefix}privacy/">プライバシーポリシー</a><a href="${prefix}disclaimer/">免責事項</a><a href="${prefix}contact/">お問い合わせ</a></div></div><div class="wrap footer-bottom">© 2026 現場屋の自力経営</div></footer><script src="${prefix}site-config.js"></script><script src="${prefix}site.js"></script></body></html>`;

const articles=readdirSync(join(root,'content/articles')).filter(file=>file.endsWith('.md')).map(file=>parseFile(join(root,'content/articles',file))).filter(article=>article.published!==false).sort((a,b)=>b.date.localeCompare(a.date)||Number(b.episode)-Number(a.episode));
const guides=readdirSync(join(root,'content/guides')).filter(file=>file.endsWith('.md')).map(file=>parseFile(join(root,'content/guides',file))).filter(guide=>guide.published!==false);
const shortGuide=guides.find(guide=>guide.kind==='short');
const fullGuide=guides.find(guide=>guide.kind==='full');
if(!shortGuide||!fullGuide)throw new Error('Guide source files are missing');
const categories=['0円から始めた集客','Google・口コミ','下請け依存と価格','HP・AI','実録・失敗・途中経過'];
const card=article=>`<a class="article-card" href="articles/${article.slug}/"><div class="meta">${article.episode?`<span class="tag">第${escapeHtml(article.episode)}話</span>`:''}<span class="tag">${escapeHtml(article.category)}</span><time datetime="${article.date}">${formatDate(article.date)}</time></div><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.description)}</p><span class="read">続きを読む →</span></a>`;
const firstEpisode=articles.find(article=>Number(article.episode)===1);

const home=`${head({title:`${siteName}｜${subtitle}`,description:'地方の現場職人が、下請けだけに頼らず自分で仕事を取れる状態を作るまでの実体験、失敗、遠回り、途中経過を記録するブログ。'})}<body>${header('./')}<main><section class="hero"><div class="wrap"><div class="eyebrow">地方の現場職人による実録</div><h1>${siteName}<span>下請け100%だった職人が、HPを公開して約3年。<br>今ではAI検索をきっかけに、問い合わせが来るようになりました。</span></h1><p>特別なことをしたわけではありません。投稿を忘れたり、サボったりもしました。それでも、できる時に少しずつ積み上げてきた実録です。</p></div></section>
<section class="section" id="about"><div class="wrap about-grid"><div class="about-label">下請けを否定したいわけではありません。<br>選べない状態から抜けたいだけです。</div><div class="about-copy"><div class="eyebrow">ABOUT THIS BLOG</div><h2>誰と、いくらで、いつ働くか。<br>少しずつ自分で選べるように。</h2><p>下請けには、営業せず施工へ集中できる良さがあります。ただ、そこしか仕事の入口がないと、価格も日程も仕事量も自分では決めにくくなります。</p><p><strong>「下請けしか選べない状態」から少しずつ抜ける。</strong>このブログが書きたいのは、その途中の話です。</p><p>成功法則ではありません。もっと早い方法もあるかもしれませんが、少なくとも自分が実際にやったこと、失敗したこと、まだ試していることを淡々と残します。</p></div></div></section>
<section class="section alt pathway-section" id="guides"><div class="wrap"><div class="section-head"><div><div class="eyebrow">TWO WAYS TO READ</div><h2>実録と、実務ガイド。</h2></div><p>これまでの経緯を読む連載と、今すぐ使える考え方をまとめた実務ガイドを分けています。</p></div><div class="pathway-grid"><a class="pathway-card" href="articles/${firstEpisode.slug}/"><span>連載</span><h3>実録を読む</h3><p>下請け中心だった頃から、直客の入口を少しずつ増やしてきた過程です。</p><strong>第1話から読む →</strong></a><a class="pathway-card guide" href="guide/hp-after-publish/"><span>無料ガイド</span><h3>現場屋向け実務ガイド</h3><p>ホームページ公開後に、無理なく続ける最低限の運用をまとめました。</p><strong>ガイドを読む →</strong></a></div></div></section>
<section class="section alt" id="articles"><div class="wrap"><div class="section-head"><div><div class="eyebrow">START HERE</div><h2>まず読んでほしい記事</h2></div><p>広告費も知識もほとんどないところから始めました。実際にやってきたことを、順番に公開していきます。</p></div><div class="article-grid">${articles.filter(a=>a.featured).map(card).join('')}</div></div></section>
<section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">CATEGORY</div><h2>テーマから読む</h2></div></div><div class="category-list">${categories.map(category=>`<a href="#latest" data-category="${escapeHtml(category)}">${escapeHtml(category)}</a>`).join('')}</div></div></section>
<section class="section alt" id="latest"><div class="wrap"><div class="section-head"><div><div class="eyebrow">LATEST</div><h2>最新記事</h2></div></div><div class="article-grid">${articles.map(card).join('')}</div></div></section>
<section class="section"><div class="wrap progress"><div><div class="eyebrow">IN PROGRESS</div><h2>現在進行形</h2><p>完成した成功談ではなく、今も試していることを記録します。結果が出なかったものも、後から分かる形で残していく予定です。</p></div><div class="progress-box"><p><strong>いま試していること</strong><br>施工写真と地域情報を積み上げたとき、検索やAIからどのように見つけられるか。問い合わせ数だけでなく、相談の内容がどう変わるかも見ています。</p></div></div></section>
<section class="wrap quiet-cta"><div><h2>ここまで読んで、考え方に合うと感じた方へ</h2><p>現場仕事を理解したホームページ制作を、<strong>300,000円（税込）</strong>で行っています。</p></div><a class="text-link hp-service-link" href="https://construction-web-terra.com/?ref=jiriki-blog#contact">HP制作について詳しく見る →</a></section></main>${footer('./')}`;

const stripGuideLead=body=>body.replace(/^# .*\n\n## .*\n\n/,'').trim();
const guideSchema=(guide,path)=>({'@context':'https://schema.org','@graph':[{'@type':'Article',headline:guide.h1,description:guide.description,mainEntityOfPage:`${domain}${path}`,author,publisher:{'@type':'Organization',name:siteName,url:domain}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:siteName,item:`${domain}/`},{'@type':'ListItem',position:2,name:'現場屋向け実務ガイド',item:`${domain}/guide/hp-after-publish/`},...(guide.kind==='full'?[{'@type':'ListItem',position:3,name:'詳細版',item:`${domain}${path}`}]:[])]}]});

function shortGuidePage(guide){
  const path='/guide/hp-after-publish/';
  const source=stripGuideLead(guide.body).split('## **もう少し詳しく知りたい方へ**')[0].trim();
  return `${head({title:`${guide.title}｜${siteName}`,description:guide.description,path,type:'article',assetPrefix:'../../',structuredData:guideSchema(guide,path)})}<body data-guide-page="short">${header('../../')}<main><header class="guide-hero"><div class="wrap narrow"><div class="eyebrow">現場屋向け実務ガイド・無料版</div><h1>${escapeHtml(guide.h1)}</h1><p>${escapeHtml(guide.description)}</p></div></header><div class="wrap guide-layout"><article class="guide-body">${markdown(source)}<section class="guide-next"><span>詳細版</span><h2>もう少し詳しい理由や実体験まで読む</h2><p>なぜその運用が必要なのか、実際にやって分かったことまで詳しくまとめています。</p><a class="guide-button" href="full/" data-guide-event="guide_full_click">詳細版を読む →</a></section><section class="guide-cweb-note"><h2>ホームページ制作そのものを相談したい方へ</h2><p>現場仕事を理解したホームページ制作については、C-WEBで案内しています。</p><a href="https://construction-web-terra.com/" data-guide-event="guide_cweb_click">C-WEBを見る →</a></section></article></div></main>${footer('../../')}`;
}

function fullGuidePage(guide){
  const path='/guide/hp-after-publish/full/';
  const source=stripGuideLead(guide.body);
  const chapterPattern=/^## (\d+\. .+)$/gm;
  const chapters=[...source.matchAll(chapterPattern)];
  const intro=source.slice(0,chapters[0].index).replace(/---/g,'').trim();
  const rendered=chapters.map((match,index)=>{
    const end=index+1<chapters.length?chapters[index+1].index:source.length;
    const block=source.slice(match.index+match[0].length,end).trim();
    const summaryMatch=block.match(/^### 要約\n\n([\s\S]*?)\n\n### 詳細\n\n([\s\S]*)$/);
    if(!summaryMatch)throw new Error(`Invalid full guide chapter: ${match[1]}`);
    let detail=summaryMatch[2].trim();
    let after='';
    if(index===chapters.length-1){
      const tailIndex=detail.indexOf('\n\n---\n\n## 最低限チェックリスト');
      if(tailIndex>=0){after=detail.slice(tailIndex+5).trim();detail=detail.slice(0,tailIndex).trim()}
    }
    return `<section class="guide-chapter"><h2>${inline(match[1])}</h2><p class="guide-summary">${inline(summaryMatch[1].replace(/\n+/g,' '))}</p><details><summary>詳しく見る</summary><div class="guide-detail">${markdown(detail)}</div></details></section>${after?`<section class="guide-tail">${markdown(after)}</section>`:''}`;
  }).join('');
  return `${head({title:`${guide.title}｜${siteName}`,description:guide.description,path,type:'article',assetPrefix:'../../../',structuredData:guideSchema(guide,path)})}<body data-guide-page="full">${header('../../../')}<main><header class="guide-hero full"><div class="wrap narrow"><div class="eyebrow">現場屋向け実務ガイド・詳細版</div><h1>${escapeHtml(guide.h1)}</h1><p>${escapeHtml(guide.description)}</p><a class="guide-back" href="../">← まず短縮版を読む</a></div></header><div class="wrap guide-layout"><article class="guide-body"><div class="guide-intro">${markdown(intro)}</div>${rendered}<section class="guide-next cweb"><span>C-WEB</span><h2>HP制作そのものを相談したい方へ</h2><p>現場仕事を理解したホームページ制作について、必要なページ構成や進め方を案内しています。</p><a class="guide-button guide-cweb-link" href="https://construction-web-terra.com/" data-guide-event="guide_cweb_click">C-WEBを見る →</a></section></article></div></main>${footer('../../../')}`;
}

function articlePage(article,index){
  const previous=articles[index+1];
  const next=articles[index-1];
  const related=articles.filter(item=>item.slug!==article.slug&&item.category===article.category).slice(0,2);
  const fallback=articles.filter(item=>item.slug!==article.slug&&!related.includes(item)).slice(0,2-related.length);
  const navigation=previous||next?`<nav class="post-nav" aria-label="前後の記事">${previous?`<a href="../${previous.slug}/">← 第${escapeHtml(previous.episode)}話<br><strong>${escapeHtml(previous.title)}</strong></a>`:'<span></span>'}${next?`<a href="../${next.slug}/">第${escapeHtml(next.episode)}話 →<br><strong>${escapeHtml(next.title)}</strong></a>`:''}</nav>`:'';
  const relatedItems=[...related,...fallback];
  const relatedSection=relatedItems.length?`<section class="related"><h2>関連記事</h2><div class="related-list">${relatedItems.map(item=>`<a href="../${item.slug}/">${escapeHtml(item.title)}</a>`).join('')}</div></section>`:'';
  const structuredData={'@context':'https://schema.org','@graph':[{'@type':'Article',headline:article.title,description:article.description,datePublished:article.date,dateModified:article.modified||article.date,mainEntityOfPage:articleUrl(article),author,publisher:{'@type':'Organization',name:siteName,url:domain}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:siteName,item:`${domain}/`},{'@type':'ListItem',position:2,name:`第${article.episode}話`,item:articleUrl(article)}]}]};
  return `${head({title:`${article.title}｜${siteName}`,description:article.description,path:`/articles/${article.slug}/`,type:'article',assetPrefix:'../../',structuredData})}<body>${header('../../')}<main><header class="article-hero"><div class="wrap"><div class="article-meta"><span class="tag">第${escapeHtml(article.episode)}話</span><span class="tag">${escapeHtml(article.category)}</span><time datetime="${article.date}">${formatDate(article.date)}</time></div><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.description)}</p></div></header><div class="wrap article-layout"><article class="article-body">${markdown(article.body)}${navigation}${relatedSection}<a class="back-home" href="../../">トップへ戻る →</a></article><aside class="article-aside"><strong>このブログについて</strong><p>愛媛県松山市周辺で外構・エクステリアの現場に携わる職人が、下請け中心から直客の入口を作ってきた途中経過を書いています。</p><p>現場仕事を理解したHP制作を、<strong>300,000円（税込）</strong>で行っています。</p><a class="text-link hp-service-link" href="https://construction-web-terra.com/?ref=jiriki-blog#contact">HP制作について詳しく見る →</a></aside></div></main>${footer('../../')}`;
}

const legalPages={
  about:{title:'このブログについて',description:'現場屋の自力経営の運営者情報と、記事を書くうえで大切にしていること。',body:`<h2>運営者について</h2><p>愛媛県松山市周辺で、外構・エクステリアの現場に長く携わっている現役の職人です。カーポート施工の経験も多く、今も実際に現場仕事を続けながら、下請け中心だった状態から少しずつ直客の入口を増やしてきました。</p><p>このブログでは、その途中で経験したジモティ、Googleマップ、口コミ、ホームページ、AI検索などの実話を記録しています。</p><h2>このブログの目的</h2><p>下請けそのものを否定するのではなく、「下請けしか選べない状態」から少しずつ抜けるために、自分が実際に行ってきたことを記録します。</p><h2>書く内容</h2><p>地方の施工業者として行った集客、価格の失敗、Googleやホームページの活用、まだ結果が出ていない試みも含めて書きます。誰にでも同じ結果が出る成功法則として紹介するものではありません。</p><h2>匿名で運営する理由</h2><p>個人名、屋号、詳しい所在地、取引先など、本人や顧客を特定できる情報は掲載しません。実体験の中身を主役にしながら、関係者のプライバシーを守るためです。</p>`},
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
const shortGuideOutput=join(dist,'guide','hp-after-publish','index.html');
mkdirSync(dirname(shortGuideOutput),{recursive:true});
writeFileSync(shortGuideOutput,shortGuidePage(shortGuide));
const fullGuideOutput=join(dist,'guide','hp-after-publish','full','index.html');
mkdirSync(dirname(fullGuideOutput),{recursive:true});
writeFileSync(fullGuideOutput,fullGuidePage(fullGuide));
for(const file of readdirSync(join(root,'public'))){cpSync(join(root,'public',file),join(dist,file),{recursive:true})}
writeFileSync(join(dist,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${domain}/sitemap.xml\n`);
const urls=['/',...articles.map(a=>`/articles/${a.slug}/`),'/guide/hp-after-publish/','/guide/hp-after-publish/full/',...Object.keys(legalPages).map(slug=>`/${slug}/`)];
writeFileSync(join(dist,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path=>`\n  <url><loc>${domain}${path}</loc></url>`).join('')}\n</urlset>\n`);
writeFileSync(join(dist,'404.html'),`${head({title:`ページが見つかりません｜${siteName}`,description:'お探しのページは見つかりませんでした。',path:'/404.html'})}<body>${header('./')}<main class="not-found"><div class="eyebrow">404</div><h1>ページが見つかりません</h1><a class="back-home" href="./">トップへ戻る →</a></main>${footer('./')}`);

for(const required of ['index.html','styles.css','guide.css','guide-components.css','site.js','site-config.js','CNAME','robots.txt','sitemap.xml'])if(!existsSync(join(dist,required)))throw new Error(`Missing: ${required}`);
console.log(`Build complete: ${articles.length} articles, ${urls.length} sitemap URLs`);
