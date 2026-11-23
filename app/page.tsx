import Dashboard from "./dashboard";
import fs from "node:fs";
import path from "node:path";

type Issue = {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  items: Array<{id:string;title:string;summary:string;region:string;category:string;date:string;url:string;source:string;titleKo?:string;summaryKo?:string;sourceType?:string;verification?:string}>;
  fcmItems?: Array<{id:string;title:string;summary:string;region:string;category:string;date:string;url:string;source:string;titleKo?:string;summaryKo?:string;sourceType?:string;verification?:string}>;
  collection?: {regionStatus?:Record<string,{count:number;status:string;queries:number;returned:number;errors:string[]}>};
};

function koreaDate(timestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(timestamp));
}

function loadIssues(): Issue[] {
  const directory=path.join(process.cwd(),"data","archive");
  const issues:Issue[]=[];
  if(fs.existsSync(directory)){
    for(const filename of fs.readdirSync(directory).filter(name=>/^\d{4}-\d{2}-\d{2}\.json$/.test(name))){
      try{
        const issue=JSON.parse(fs.readFileSync(path.join(directory,filename),"utf8")) as Issue;
        if(!issue.generatedAt||!issue.periodStart||!issue.periodEnd||!Array.isArray(issue.items))continue;
        // One regular Monday edition per week. Keep historical test files on disk.
        const published=koreaDate(issue.generatedAt);
        if(new Date(published+"T00:00:00Z").getUTCDay()!==1)continue;
        if(filename.slice(0,10)!==published)continue;
        issues.push(issue);
      }catch(error){console.warn("Skipping invalid archive",filename,error)}
    }
  }
  const latest=JSON.parse(fs.readFileSync(path.join(process.cwd(),"data","latest.json"),"utf8")) as Issue;
  if(!issues.some(issue=>koreaDate(issue.generatedAt)===koreaDate(latest.generatedAt)))issues.push(latest);
  return issues.sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt));
}

export default function Page(){
  const archives=loadIssues();
  return <Dashboard data={archives[0]} archives={archives}/>;
}
