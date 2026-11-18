import fs from "node:fs/promises";
import crypto from "node:crypto";
import Parser from "rss-parser";
const parser=new Parser({timeout:18000,headers:{"User-Agent":"Mozilla/5.0 WeeklyCERTI/2.0"}});
const args=process.argv.slice(2);
const arg=name=>{const i=args.indexOf(name);return i<0?null:args[i+1]};
const dateOK=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||"")&&!Number.isNaN(Date.parse(s+"T00:00:00Z"));
const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const issueDate=arg("--issue-date")||today;
if(!dateOK(issueDate))throw Error("Invalid issue date");
const monday=new Date(issueDate+"T00:00:00Z");
const previous=n=>new Date(monday.getTime()-n*86400000).toISOString().slice(0,10);
const start=arg("--start")||previous(7),end=arg("--end")||previous(1);
if(!dateOK(start)||!dateOK(end)||start>end)throw Error("Invalid period");
const sources=[
 {region:"미국",category:"UL",q:'"UL Solutions" electrical safety certification OR "UL standard" appliance'},
 {region:"미국",category:"UL",q:'"UL 60335" OR "UL 60745" OR "UL 62368" safety standard'},
 {region:"EU",category:"CE",q:'"CE marking" electrical appliances conformity assessment'},
 {region:"EU",category:"EMC",q:'"EMC Directive" electromagnetic compatibility compliance'},
 {region:"EU",category:"ErP",q:'"Ecodesign" "energy-related products" EU regulation'},
 {region:"EU",category:"RoHS",q:'"RoHS Directive" electrical electronic equipment'},
 {region:"한국",category:"KC",q:'"KC 인증" "전기용품" 안전기준'},
 {region:"한국",category:"KC",q:'"국가기술표준원" "전기용품" 안전인증'},
 {region:"중국",category:"CCC",q:'"CCC certification" electrical appliances China'},
 {region:"중국",category:"CNCA",q:'"CNCA" electrical product certification'},
 {region:"일본",category:"PSE",q:'"PSE" "DENAN" electrical appliances Japan'},
 {region:"국제",category:"IEC",q:'"IEC 60335" OR "IEC electrical safety standard"'},
 {region:"국제",category:"ISO",q:'"ISO standard" electrical appliance product safety'},
 {region:"국제",category:"IECEE",q:'"IECEE CB Scheme" electrical certification'},
 {region:"기타",category:"인도 BIS",q:'India "BIS" electrical appliances mandatory certification'},
 {region:"기타",category:"인도네시아 SNI",q:'Indonesia "SNI" electrical appliance certification'},
 {region:"기타",category:"베트남 CR",q:'Vietnam electrical appliance conformity certification CR mark'},
 {region:"기타",category:"필리핀 PS·ICC",q:'Philippines DTI BPS electrical appliances PS ICC certification'},
 {region:"기타",category:"기타 국가 전기안전",q:'electrical appliance safety certification regulations Australia Brazil Mexico Saudi Arabia Thailand Malaysia Turkey South Africa'}
];
const nextDay=new Date(Date.parse(end+"T00:00:00Z")+86400000).toISOString().slice(0,10);
const relevant=/\bUL\b|\bCE\b|\bEMC\b|\bErP\b|\bRoHS\b|\bKC\b|\bCCC\b|\bCNCA\b|\bPSE\b|\bIEC\b|\bISO\b|\bIECEE\b|\bBIS\b|\bSNI\b|\bCR mark\b|\bICC\b|\bPS mark\b|electrical safety|product safety|conformity|certification|ecodesign|전기안전|안전인증|전기용품|안전기준/i;
const results=[];const failures=[];let success=0;
for(const source of sources){
 try{
  const query=source.q+" after:"+start+" before:"+nextDay;
  const url="https://news.google.com/rss/search?q="+encodeURIComponent(query)+"&hl=en-US&gl=US&ceid=US:en";
  const feed=await parser.parseURL(url);
  if(!Array.isArray(feed.items))throw Error("Invalid feed");
  success++;
  for(const entry of feed.items){
   const title=String(entry.title||"").trim();
   if(!relevant.test(title))continue;
   const rawDate=entry.isoDate||entry.pubDate;
   if(!rawDate||Number.isNaN(Date.parse(rawDate)))continue;
   const day=new Date(rawDate).toISOString().slice(0,10);
   if(day<start||day>end)continue;
   const link=String(entry.link||"");
   if(!/^https:\/\//.test(link))continue;
   const snippet=String(entry.contentSnippet||entry.content||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
   const id=crypto.createHash("sha256").update(title.toLowerCase()).digest("hex").slice(0,16);
   results.push({id,title,summary:snippet.slice(0,850)||title,region:source.region,category:source.category,date:day,url:link,source:entry.creator||entry.source?.title||"Google News RSS",sourceType:"news-search"});
  }
 }catch(e){failures.push(source.region+"/"+source.category+": "+e.message);console.error("Feed failure:",source.category,e.message)}
}
if(success===0)throw Error("All news sources failed. Existing issue preserved.");
const items=[...new Map(results.map(item=>[item.id,item])).values()].sort((a,b)=>b.date.localeCompare(a.date));
if(items.length===0)throw Error("No matching electrical safety news. Existing issue preserved.");
async function translate(value){
 if(!value||/[가-힣]/.test(value))return value;
 try{
  const url=new URL("https://translate.googleapis.com/translate_a/single");
  for(const [k,v] of Object.entries({client:"gtx",sl:"auto",tl:"ko",dt:"t",q:value.slice(0,1200)}))url.searchParams.set(k,v);
  const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error("HTTP "+response.status);
  const data=await response.json();
  return (data?.[0]||[]).map(p=>p?.[0]||"").join("").trim()||value;
 }catch(e){console.warn("Translation failed",e.message);return value}
}
for(const item of items){item.titleKo=await translate(item.title);item.summaryKo=await translate(item.summary)}
const output={generatedAt:new Date(issueDate+"T08:00:00+09:00").toISOString(),periodStart:start,periodEnd:end,items,collection:{source:"Google News RSS",successfulQueries:success,totalQueries:sources.length,failures}};
await fs.mkdir("data/archive",{recursive:true});
await fs.writeFile("data/archive/"+issueDate+".json",JSON.stringify(output,null,2)+"\n");
await fs.writeFile("data/latest.json",JSON.stringify(output,null,2)+"\n");
console.log("Published",items.length,"articles",start,end,"successful queries",success+"/"+sources.length);
