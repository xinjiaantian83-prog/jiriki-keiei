const measurementId=window.SITE_CONFIG?.ga4MeasurementId?.trim();
if(measurementId){
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments)};
  window.gtag('js',new Date());
  window.gtag('config',measurementId);
  const script=document.createElement('script');
  script.async=true;
  script.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  const sendEvent=(name,parameters={})=>window.gtag('event',name,parameters);
  const article=document.querySelector('.article-body');
  if(article){
    sendEvent('view_article',{
      article_title:document.querySelector('.article-hero h1')?.textContent?.trim()||document.title,
      article_path:window.location.pathname
    });
  }

  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');
    if(!link)return;
    const href=link.getAttribute('href')||'';

    if(link.matches('.hp-service-link')){
      sendEvent('click_hp_service',{link_url:href,link_text:link.textContent.trim(),source:'jiriki-blog',ref:'jiriki-blog'});
    }

    let url;
    try{url=new URL(href,window.location.href)}catch{return}
    if(url.hostname==='note.com'||url.hostname.endsWith('.note.com')){
      sendEvent('click_note',{link_url:url.href,link_text:link.textContent.trim()});
    }
    if(/^https?:$/.test(url.protocol)&&url.origin!==window.location.origin){
      sendEvent('click_external',{link_url:url.href,link_domain:url.hostname,link_text:link.textContent.trim()});
    }
  });
}

const menu=document.querySelector('[data-menu]');
const nav=document.querySelector('[data-nav]');
menu?.addEventListener('click',()=>{
  const open=nav.classList.toggle('is-open');
  menu.setAttribute('aria-expanded',String(open));
});
