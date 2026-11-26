import {isRegulatoryChange} from "./regulatory-filter.mjs";
import {crawlOfficial} from "./crawl-official.mjs";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import Parser from "rss-parser";
const parser=new Parser({timeout:18000,headers:{"User-Agent":"Mozilla/5.0 WeeklyCERTI/2.0"}});
// Korean news searches use NAVER API HUB; all other regions retain Google News RSS.
const naverId=process.env.NAVER_CLIENT_ID;
const naverSecret=process.env.NAVER_CLIENT_SECRET;
async function searchNaverNews(query){
 if(!naverId||!naverSecret)throw Error("NAVER API HUB credentials missing");
 const strip=s=>String(s||"").replace(/<[^>]+>/g," ").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/\s+/g," ").trim();
 const entries=[];
 const pageLimit=process.argv.includes("--archive-only")?10:1;
 for(let page=0;page<pageLimit;page++){
  const url=new URL("https://naverapihub.apigw.ntruss.com/search/v1/news");
  for(const [key,value] of Object.entries({query,display:"100",start:String(page*100+1),sort:"date"}))url.searchParams.set(key,value);
  const response=await fetch(url,{headers:{"X-NCP-APIGW-API-KEY-ID":naverId,"X-NCP-APIGW-API-KEY":naverSecret},signal:AbortSignal.timeout(18000)});
  if(!response.ok)throw Error("NAVER API HUB HTTP "+response.status);
  const data=await response.json();
  if(!Array.isArray(data.items))throw Error("Invalid NAVER news response");
  entries.push(...data.items.map(item=>({title:strip(item.title),isoDate:item.pubDate,link:item.originallink||item.link,contentSnippet:strip(item.description),source:{title:"NAVER 뉴스 검색"}})));
  if(!archiveOnly||data.items.length<100)break;
  // Naver returns newest first. Stop when the historical target week is reached.
  const lastDate=Date.parse(data.items[data.items.length-1]?.pubDate||"");
  if(Number.isFinite(lastDate)&&lastDate<Date.parse(start+"T00:00:00Z"))break;
  await new Promise(resolve=>setTimeout(resolve,300));
 }
 return {items:entries};
}
async function searchNews(source,query){
 if(source.region==="한국")return searchNaverNews(source.q);
 const locale=source.region==="일본"?"hl=ja&gl=JP&ceid=JP:ja":source.region==="중국"?"hl=zh-CN&gl=CN&ceid=CN:zh-Hans":"hl=en-US&gl=US&ceid=US:en";
 const url="https://news.google.com/rss/search?q="+encodeURIComponent(query)+"&"+locale;
 return parser.parseURL(url);
}

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
const archiveOnly=args.includes("--archive-only");
const skipExisting=args.includes("--skip-existing");
if(archiveOnly&&skipExisting){
 try{
  await fs.access("data/archive/"+issueDate+".json");
  console.log("Historical issue already exists; preserving",issueDate);
  process.exit(0);
 }catch{}
}
const fcmSources=[
 {region:"미국",category:"FDA 식품접촉",q:'"food contact" FDA regulation amendment'},
 {region:"EU",category:"EU FCM",q:'"food contact materials" EU regulation amendment'},
 {region:"EU",category:"EFSA FCM",q:'EFSA "food contact" plastics migration'},
  {region:"한국",category:"식품용 기구·용기·포장",q:'기구 및 용기 포장 기준 규격 개정'},
 {region:"한국",category:"식품용 기구·용기·포장",q:'식품접촉재료 안전기준'},
 {region:"한국",category:"식품용 기구·용기·포장",q:'식품용 기구 용기 포장 고시'},
 {region:"한국",category:"식품용 기구·용기·포장",q:'식약처 용출규격 개정'},
 {region:"중국",category:"GB 4806",q:'食品接触材料 标准 修订'},
 {region:"일본",category:"식품용 기구·용기·포장",q:'食品用器具 容器包装 改正'},
 {region:"국제",category:"FCM 국제",q:'"food contact" regulation migration limit'}
];
const sources=[
 {region:"미국",category:"UL",q:'"UL Solutions" electrical safety certification OR "UL standard" appliance'},
 {region:"미국",category:"UL",q:'"UL 60335" OR "UL 60745" OR "UL 62368" safety standard'},
 {region:"EU",category:"CE",q:'"CE marking" electrical appliances conformity assessment'},
 {region:"EU",category:"EMC",q:'"EMC Directive" electromagnetic compatibility compliance'},
 {region:"EU",category:"ErP",q:'"Ecodesign" "energy-related products" EU regulation'},
 {region:"EU",category:"RoHS",q:'"RoHS Directive" electrical electronic equipment'},
 {region:"한국",category:"KC",q:'국가기술표준원 전기용품'},
 {region:"한국",category:"KC",q:'국가기술표준원 전기 용품'},
 {region:"한국",category:"KC",q:'기술표준원 전기용품'},
 {region:"한국",category:"KC",q:'기술표준원 전기 용품'},
 {region:"중국",category:"CCC",q:'CCC 强制性产品认证 电器 安全标准 修订 公告'},
 {region:"중국",category:"CNCA",q:'国家认监委 CNCA 强制性认证 实施规则 更新'},
 {region:"일본",category:"PSE",q:'電気用品安全法 PSE 技術基準 改正 施行'},
 {region:"국제",category:"IEC",q:'"IEC 60335" OR "IEC electrical safety standard"'},
 {region:"국제",category:"ISO",q:'"ISO standard" electrical appliance product safety'},
 {region:"국제",category:"IECEE",q:'"IECEE CB Scheme" electrical certification'},
 {region:"기타",category:"인도 BIS",q:'India "BIS" electrical appliances mandatory certification'},
 {region:"기타",category:"인도네시아 SNI",q:'Indonesia "SNI" electrical appliance certification'},
 {region:"기타",category:"베트남 CR",q:'Vietnam electrical appliance conformity certification CR mark'},
 {region:"기타",category:"필리핀 PS·ICC",q:'Philippines DTI BPS electrical appliances PS ICC certification'},
 {region:"기타",category:"기타 국가 전기안전",q:'electrical appliance safety certification regulations Australia Brazil Mexico Saudi Arabia Thailand Malaysia Turkey South Africa'}
];
const officialSources=[
 {region:"미국",category:"UL",domain:"ulse.org",q:"UL standard revision publication"},
 {region:"미국",category:"UL",domain:"ul.com",q:"UL standards safety certification update"},
 {region:"EU",category:"CE·EMC·ErP·RoHS",domain:"eur-lex.europa.eu",q:"electromagnetic compatibility ecodesign RoHS amendment regulation"},
 {region:"EU",category:"CE·EMC·ErP·RoHS",domain:"ec.europa.eu",q:"CE marking EMC ecodesign RoHS regulatory update"},
 {region:"한국",category:"KC",domain:"kats.go.kr",q:"전기용품 안전기준 개정 고시"},
 {region:"한국",category:"KC",domain:"law.go.kr",q:"전기용품 안전관리 개정 시행"},
 {region:"중국",category:"CCC·CNCA",domain:"cnca.gov.cn",q:"CCC 强制性产品认证 修订 公告"},
 {region:"중국",category:"CCC·CNCA",domain:"samr.gov.cn",q:"电器 强制性认证 标准 修订"},
 {region:"일본",category:"PSE",domain:"meti.go.jp",q:"電気用品安全法 改正 技術基準"},
 {region:"국제",category:"IEC",domain:"iec.ch",q:"IEC 60335 amendment new edition"},
 {region:"국제",category:"ISO",domain:"iso.org",q:"ISO electrical appliance standard revision"},
 {region:"국제",category:"IECEE",domain:"iecee.org",q:"CB Scheme operational document update"},
 {region:"기타",category:"인도 BIS",domain:"bis.gov.in",q:"electrical appliances certification notification"},
 {region:"기타",category:"인도네시아 SNI",domain:"bsn.go.id",q:"SNI peralatan listrik revisi"},
 {region:"기타",category:"베트남 전기안전",domain:"most.gov.vn",q:"thiết bị điện quy chuẩn sửa đổi"},
 {region:"기타",category:"필리핀 PS·ICC",domain:"dti.gov.ph",q:"electrical appliances certification standards"},
 {region:"기타",category:"기타 국가 전기안전",domain:"gov.br",q:"INMETRO electrical appliances certification"},
 {region:"기타",category:"기타 국가 전기안전",domain:"gov.au",q:"electrical equipment safety certification regulation"}
];
const nextDay=new Date(Date.parse(end+"T00:00:00Z")+86400000).toISOString().slice(0,10);
const fallbackStart=new Date(Date.parse(start+"T00:00:00Z")-21*86400000).toISOString().slice(0,10);
const regionStats=Object.fromEntries(["미국","EU","한국","중국","일본","국제","기타"].map(r=>[r,{queries:0,returned:0,accepted:0,errors:[]}]));
const fallbackQueries={
 "미국":'"UL Solutions" certification OR "UL standard" safety',
 "EU":'"CE marking" OR "EMC Directive" OR "Ecodesign" OR "RoHS" electrical',
 "한국":'"KC 인증" OR "전기용품 안전기준" OR "국가기술표준원"',
 "중국":'"CCC certification" OR "CNCA" appliances',
 "일본":'"PSE certification" OR "DENAN" electrical',
 "국제":'"IEC standard" OR "IECEE" OR "ISO standard" electrical',
 "기타":'"BIS certification" OR "SNI certification" OR "electrical safety certification"'
};
const relevant=/電気用品|技術基準|改正|施行|强制性|认证|认监委|电器|安全标准|修订|实施规则|\bUL\b|\bCE\b|\bEMC\b|\bErP\b|\bRoHS\b|\bKC\b|\bCCC\b|\bCNCA\b|\bPSE\b|\bIEC\b|\bISO\b|\bIECEE\b|\bBIS\b|\bSNI\b|\bCR mark\b|\bICC\b|\bPS mark\b|electrical safety|product safety|conformity|certification|ecodesign|전기안전|안전인증|전기용품|안전기준/i;
const direct=await crawlOfficial(start,end);
const results=[...direct.items];
const fcmResults=[];const fcmStats={queries:0,returned:0,candidates:0,accepted:0,errors:[]};const failures=[];let success=0;
for(const entry of direct.items){regionStats[entry.region].accepted++}
for(const source of [...fcmSources.map(x=>({...x,fcm:true})),...officialSources.map(x=>({...x,officialSearch:true,q:"site:"+x.domain+" "+x.q})),...sources]){
 try{
  const query=source.q+" after:"+start+" before:"+nextDay;
  if(source.fcm&&source.region!=="한국")await new Promise(resolve=>setTimeout(resolve,1200));
  const feed=await searchNews(source,query);
  if(!Array.isArray(feed.items))throw Error("Invalid feed");
  success++;
  if(source.fcm){fcmStats.queries++;fcmStats.returned+=feed.items.length}
  regionStats[source.region].queries++;
  regionStats[source.region].returned+=feed.items.length;
  for(const entry of feed.items){
   const title=String(entry.title||"").trim();
   if(!source.fcm&&!relevant.test(title)&&!source.officialSearch&&!(source.region==="한국"&&source.category==="KC"))continue;
   const rawDate=entry.isoDate||entry.pubDate;
   if(!rawDate||Number.isNaN(Date.parse(rawDate)))continue;
   const day=new Date(rawDate).toISOString().slice(0,10);
   if(day<start||day>end)continue;
   const link=String(entry.link||"");
   if(!/^https:\/\//.test(link))continue;
   const snippet=String(entry.contentSnippet||entry.content||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
   const id=crypto.createHash("sha256").update(title.toLowerCase()).digest("hex").slice(0,16);
   if(source.fcm)fcmStats.candidates++;
   (source.fcm?fcmResults:results).push({id,title,summary:snippet.slice(0,850)||title,region:source.region,category:source.category,date:day,url:link,source:entry.creator||entry.source?.title||"Google News RSS",sourceType:source.officialSearch?"official-site-search":source.region==="한국"?"naver-news-search":"news-search",verification:"검색 결과 — 공식 원문 확인 필요"});
   regionStats[source.region].accepted++;
  }
 }catch(e){if(source.fcm)fcmStats.errors.push(source.category+": "+e.message);failures.push(source.region+"/"+source.category+": "+e.message);regionStats[source.region].errors.push(source.category+": "+e.message);console.error("Feed failure:",source.category,e.message)}
}
if(success===0&&!direct.status.some(s=>s.checked))throw Error("All sources failed. Existing issue preserved.");
// Retry regions with no accepted items using broader search terms, retaining the issue date window.
for(const [region,query] of Object.entries(fallbackQueries)){
 if(regionStats[region].accepted>0)continue;
 try{
  const feed=await searchNews({region,q:query},query+" after:"+start+" before:"+nextDay);
  if(!Array.isArray(feed.items))throw Error("Invalid fallback feed");
  regionStats[region].queries++;regionStats[region].returned+=feed.items.length;
  for(const entry of feed.items){
   const title=String(entry.title||"").trim();
   const rawDate=entry.isoDate||entry.pubDate;
   if((region!=="한국"&&!relevant.test(title))||!rawDate||Number.isNaN(Date.parse(rawDate)))continue;
   const day=new Date(rawDate).toISOString().slice(0,10);
   if(day<start||day>end)continue;
   const link=String(entry.link||"");
   if(!/^https:\/\//.test(link))continue;
   const snippet=String(entry.contentSnippet||entry.content||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
   const id=crypto.createHash("sha256").update(title.toLowerCase()).digest("hex").slice(0,16);
   results.push({id,title,summary:snippet.slice(0,850)||title,region,category:region==="미국"?"UL":region==="한국"?"KC":region==="중국"?"CCC·CNCA":region==="일본"?"PSE":region==="국제"?"IEC·ISO·IECEE":region==="EU"?"CE·EMC·ErP·RoHS":"전기안전 인증",date:day,url:link,source:entry.creator||entry.source?.title||"Google News RSS",sourceType:region==="한국"?"naver-news-search":"news-search"});
   regionStats[region].accepted++;
  }
 }catch(e){regionStats[region].errors.push("fallback: "+e.message);failures.push(region+"/fallback: "+e.message)}
}

const fcmStandard=/food.contact|FCM|migration limit|食品接触|食品用器具|容器包装|기구.{0,6}용기.{0,6}포장|식품접촉|식품용 기구|GB\s*4806|EU\s*10\/2011|positive list|ポジティブリスト|식약처|식품의약품안전처/i;
const fcmChange=/amend|revis|regulat|new standard|updated|effective|restriction|limit|notification|개정|고시|시행|변경|修订|发布|实施|改正|施行|規格|基準/i;
// Korean FCM articles must pass all three stages; other regions keep the existing filter.
const koreanFCMOrg=/식약처|식품의약품안전처|\bMFDS\b/i;
const koreanFCMFood=/식품/i;
const koreanFCMPackaging=/용기|포장/i;
const koreanFCMChange=/제정|개정|시행|행정예고|입법예고|고시|기준.{0,8}(변경|개정)|규격.{0,8}(변경|개정)/i;
function fcmRejectReason(item){
 const content=item.title+" "+item.summary;
 if(item.region==="한국"){
  if(!koreanFCMOrg.test(content))return "한국 1단계: 식약처/식품의약품안전처/MFDS 불일치";
  if(!koreanFCMFood.test(content)||!koreanFCMPackaging.test(content))return "한국 2단계: 식품 및 용기/포장 조건 불일치";
  if(!koreanFCMChange.test(content))return "한국 3단계: 법령·규격 변경 조건 불일치";
  return null;
 }
 if(!fcmStandard.test(content))return "FCM subject not matched";
 if(!fcmChange.test(content))return "Regulatory change not matched";
 return null;
}
const fcmItems=[...new Map(fcmResults.filter(i=>!fcmRejectReason(i)).map(i=>[i.id,i])).values()].sort((a,b)=>b.date.localeCompare(a.date));
fcmStats.rejected=fcmResults.filter(i=>fcmRejectReason(i)).map(i=>({title:i.title,region:i.region,date:i.date,reason:fcmRejectReason(i)}));
console.log("FCM diagnostic",JSON.stringify(fcmStats));
fcmStats.accepted=fcmItems.length;
const rank=t=>t==="official-direct"?3:t==="official-site-search"?2:1;
// Korean KC requires agency + electrical appliances + regulation-change signals in title or summary.
const kcAgency=/국가기술표준원|기술표준원/i;
const kcProduct=/전기\s*용품/i;
const kcChange=/개정|제정|폐지|고시|공고|시행|변경|행정예고|입법예고/i;
function certificationAccepted(item){
 if(item.region==="한국"&&item.category==="KC"){
  const content=String(item.title||"")+" "+String(item.summary||"");
  return kcAgency.test(content)&&kcProduct.test(content)&&kcChange.test(content);
 }
 return isRegulatoryChange(item);
}
const items=[...new Map(results.filter(certificationAccepted).sort((a,b)=>rank(a.sourceType)-rank(b.sourceType)).map(item=>[item.id,item])).values()].sort((a,b)=>b.date.localeCompare(a.date));
// An empty weekly issue is valid when source checks succeed.
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
for(const item of [...items,...fcmItems]){item.titleKo=await translate(item.title);item.summaryKo=await translate(item.summary)}
const coveredRegions=["미국","EU","한국","중국","일본","국제","기타"];
const regionStatus=Object.fromEntries(coveredRegions.map(region=>{
 const count=items.filter(item=>item.region===region).length;
 const stats=regionStats[region];
 return [region,{count,status:count>0?"수집됨":stats.errors.length>=stats.queries&&stats.queries>0?"수집 오류":"해당 기간 검색 결과 없음 또는 확인 불가",queries:stats.queries,returned:stats.returned,errors:stats.errors}];
}));
const output={generatedAt:new Date(issueDate+"T08:00:00+09:00").toISOString(),periodStart:start,periodEnd:end,items,fcmItems,collection:{fcmStats,source:"Official direct HTML crawl + NAVER API HUB (Korea) + Google News RSS (other regions)",successfulQueries:success,totalQueries:sources.length+officialSources.length,regionStats,regionStatus,officialCrawl:direct.status,filteredOut:results.length-items.length,failures}};
await fs.mkdir("data/archive",{recursive:true});
await fs.writeFile("data/archive/"+issueDate+".json",JSON.stringify(output,null,2)+"\n");
if(!archiveOnly)await fs.writeFile("data/latest.json",JSON.stringify(output,null,2)+"\n");
console.log("Published",items.length,"articles",start,end,"successful queries",success+"/"+sources.length);
