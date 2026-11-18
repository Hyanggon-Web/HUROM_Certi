// Direct HTML crawl of publicly accessible official announcement pages.
// Only accepts links on the official host and with a parseable publication date.
import crypto from "node:crypto";
export const officialPages=[
 {region:"미국",category:"UL",url:"https://ulse.org/",name:"UL Standards & Engagement"},
 {region:"EU",category:"CE·EMC·ErP·RoHS",url:"https://single-market-economy.ec.europa.eu/",name:"European Commission"},
 {region:"EU",category:"CE·EMC·ErP·RoHS",url:"https://eur-lex.europa.eu/",name:"EUR-Lex"},
 {region:"한국",category:"KC",url:"https://www.kats.go.kr/",name:"국가기술표준원"},
 {region:"중국",category:"CCC·CNCA",url:"https://www.cnca.gov.cn/",name:"CNCA"},
 {region:"중국",category:"CCC·CNCA",url:"https://www.samr.gov.cn/",name:"SAMR"},
 {region:"일본",category:"PSE",url:"https://www.meti.go.jp/",name:"METI"},
 {region:"국제",category:"IEC",url:"https://www.iec.ch/",name:"IEC"},
 {region:"국제",category:"ISO",url:"https://www.iso.org/",name:"ISO"},
 {region:"국제",category:"IECEE",url:"https://www.iecee.org/",name:"IECEE"},
 {region:"기타",category:"인도 BIS",url:"https://www.bis.gov.in/",name:"BIS"},
 {region:"기타",category:"인도네시아 SNI",url:"https://www.bsn.go.id/",name:"BSN"},
 {region:"기타",category:"베트남 전기안전",url:"https://most.gov.vn/",name:"MOST"},
 {region:"기타",category:"필리핀 PS·ICC",url:"https://www.dti.gov.ph/",name:"DTI"}
];
const entities={"amp":"&","quot":'"',"apos":"'","lt":"<","gt":">","nbsp":" "};
function plain(v){return v.replace(/<[^>]*>/g," ").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(_,x)=>x[0]==="#"?String.fromCodePoint(x[1]?.toLowerCase()==="x"?parseInt(x.slice(2),16):parseInt(x.slice(1),10)):(entities[x]||" ")).replace(/\s+/g," ").trim()}
const signal=/standard|amend|revis|regulat|certif|conform|safety|ecodesign|directive|rohs|electrical|appliance|publication|notice|update|new edition|규격|개정|안전|인증|고시|전기용품|修订|认证|公告|改正|技術基準|電気用品|安全/i;
function dateOf(href,text){const s=href+" "+text;let m=s.match(/(?:20\d{2})[-/.](?:0?[1-9]|1[0-2])[-/.](?:[0-2]?\d|3[01])/);if(m){const d=new Date(m[0].replace(/[/.]/g,"-"));if(!Number.isNaN(d.getTime()))return d.toISOString().slice(0,10)}m=s.match(/(?:20\d{2})(?:0[1-9]|1[0-2])(?:[0-2]\d|3[01])/);if(m){const v=m[0],d=new Date(v.slice(0,4)+"-"+v.slice(4,6)+"-"+v.slice(6,8));if(!Number.isNaN(d.getTime()))return d.toISOString().slice(0,10)}return null}
export async function crawlOfficial(start,end){
 const items=[],status=[];
 for(const site of officialPages){
  const record={region:site.region,name:site.name,url:site.url,checked:false,accepted:0,error:null};
  try{
   const res=await fetch(site.url,{headers:{"User-Agent":"WeeklyCERTI/2.1 (public announcement monitor)","Accept":"text/html"},signal:AbortSignal.timeout(9000),redirect:"follow"});
   if(!res.ok)throw Error("HTTP "+res.status);
   const type=res.headers.get("content-type")||"";
   if(!type.includes("html"))throw Error("Not HTML");
   const html=(await res.text()).slice(0,900000);
   record.checked=true;
   const base=new URL(res.url);
   for(const match of html.matchAll(/<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)){
    const title=plain(match[4]);if(title.length<14||title.length>230||!signal.test(title))continue;
    let link;try{link=new URL(match[2],base)}catch{continue}
    if(link.protocol!=="https:"||link.hostname!==base.hostname)continue;
    const date=dateOf(link.pathname,title);
    if(!date||date<start||date>end)continue;
    const url=link.href.split("#")[0];
    items.push({id:crypto.createHash("sha256").update(url).digest("hex").slice(0,16),title,summary:title,region:site.region,category:site.category,date,url,source:site.name,sourceType:"official-direct",verification:"공식기관 웹페이지에서 링크 수집 · 내용 확인 필요"});
    record.accepted++;
   }
  }catch(e){record.error=String(e.message)}
  status.push(record);
 }
 return {items,status};
}
