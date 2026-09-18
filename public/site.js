const guideStyles=document.createElement('link');
guideStyles.rel='stylesheet';
guideStyles.href=new URL('guide.css',document.querySelector('link[rel="stylesheet"]')?.href||window.location.href).href;
document.head.appendChild(guideStyles);
const guideComponentStyles=document.createElement('link');
guideComponentStyles.rel='stylesheet';
guideComponentStyles.href=new URL('guide-components.css',document.querySelector('link[rel="stylesheet"]')?.href||window.location.href).href;
document.head.appendChild(guideComponentStyles);

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

  const guidePage=document.body.dataset.guidePage;
  if(guidePage==='short'){
    sendEvent('guide_short_view',{guide_name:'hp_after_publish',page_path:window.location.pathname});
  }
  if(guidePage==='full'){
    sendEvent('guide_full_view',{guide_name:'hp_after_publish',page_path:window.location.pathname});
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
    const guideEvent=link.dataset.guideEvent;
    if(guideEvent==='guide_full_click'){
      sendEvent('guide_full_click',{source_page:window.location.pathname,destination:url.pathname});
    }
    if(guideEvent==='guide_cweb_click'){
      sendEvent('guide_cweb_click',{source_page:window.location.pathname,link_url:url.href,link_text:link.textContent.trim()});
    }
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
