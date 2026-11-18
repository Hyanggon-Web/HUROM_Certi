import fs from "node:fs/promises";
import crypto from "node:crypto";
const args=process.argv.slice(2);
function option(name){const index=args.indexOf(name);return index<0?null:args[index+1]}
const valid=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+"T00:00:00Z"));
const kstToday=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const issueDate=option("--issue-date")||kstToday;
if(!valid(issueDate))throw Error("Invalid issue date");
const issueMidnight=new Date(issueDate+"T00:00:00Z");
const previous=days=>new Date(issueMidnight.getTime()-days*86400000).toISOString().slice(0,10);
const startDate=option("--start")||previous(7);
const endDate=option("--end")||previous(1);
if(!valid(startDate)||!valid(endDate)||startDate>endDate)throw Error("Invalid date range");
const agencies=[
 {slug:"federal-communications-commission",region:"미국",category:"EMC·무선",name:"Federal Register / FCC"},
 {slug:"energy-department",region:"미국",category:"에너지효율",name:"Federal Register / DOE"}
];
const keywords=/equipment authorization|radio frequency|electromagnetic|unlicensed device|electronic device|consumer product|energy conservation|energy efficiency|appliance|refrigerator|dishwasher|air conditioner|water heater|test procedure|certification|battery|television receiver|microwave oven|consumer electronics|energy star|external power supply|charger/i;
let items=[];let successes=0;
for(const agency of agencies){
 try{
  let page=1;
  while(page<=10){
   const url=new URL("https://www.federalregister.gov/api/v1/documents.json");
   url.searchParams.set("conditions[agencies][]",agency.slug);
   url.searchParams.set("conditions[publication_date][gte]",startDate);
   url.searchParams.set("conditions[publication_date][lte]",endDate);
   url.searchParams.set("per_page","100");
   url.searchParams.set("page",String(page));
   url.searchParams.set("order","newest");
   for(const field of ["title","abstract","publication_date","html_url","document_number"])url.searchParams.append("fields[]",field);
   const response=await fetch(url,{headers:{"User-Agent":"CertScopeWeekly/1.1 (regulatory-monitoring)"},signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error("HTTP "+response.status);
   const payload=await response.json();
   if(!Array.isArray(payload.results))throw Error("Invalid API response");
   for(const doc of payload.results){
    const title=String(doc.title||"").trim();
    const summary=String(doc.abstract||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
    if(!keywords.test(title+" "+summary))continue;
    const sourceUrl=String(doc.html_url||"");
    if(!sourceUrl.startsWith("https://www.federalregister.gov/"))continue;
    items.push({id:crypto.createHash("sha256").update(sourceUrl).digest("hex").slice(0,16),title,summary:summary.slice(0,850),region:agency.region,category:agency.category,date:doc.publication_date||"",url:sourceUrl,source:agency.name});
   }
   if(!payload.next_page_url)break;
   page++;
  }
  if(page>10)throw Error("Pagination limit exceeded");
  successes++;
 }catch(error){console.error("Source failed",agency.slug,error.message)}
}
if(successes!==agencies.length)throw Error("Source collection incomplete; previous issue preserved");
items=[...new Map(items.map(item=>[item.id,item])).values()].sort((a,b)=>b.date.localeCompare(a.date));
const output={generatedAt:new Date(issueDate+"T08:00:00+09:00").toISOString(),periodStart:startDate,periodEnd:endDate,items};
await fs.mkdir("data/archive",{recursive:true});
await fs.writeFile("data/archive/"+issueDate+".json",JSON.stringify(output,null,2)+"\n");
await fs.writeFile("data/latest.json",JSON.stringify(output,null,2)+"\n");
console.log("Published",issueDate,"range",startDate,endDate,"records",items.length);
