"use client";
import {useMemo,useState} from "react";

type News={id:string;title:string;summary:string;titleKo?:string;summaryKo?:string;region:string;category:string;date:string;url:string;source:string;sourceType?:string;verification?:string};
type Feed={generatedAt:string;periodStart:string;periodEnd:string;items:News[];fcmItems?:News[];collection?:{regionStatus?:Record<string,{count:number;status:string;queries:number;returned:number;errors:string[]}>}};
const regions=["전체","미국","EU","한국","중국","일본","국제","기타"];
function issueLabel(raw:string){
 const kst=new Date(new Date(raw).getTime()+9*3600000);
 const monday=new Date(Date.UTC(kst.getUTCFullYear(),kst.getUTCMonth(),kst.getUTCDate()));
 monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));
 const y=monday.getUTCFullYear();
 const jan4=new Date(Date.UTC(y,0,4));
 const first=new Date(jan4.getTime()-((jan4.getUTCDay()+6)%7)*86400000);
 return y+"년 "+(Math.floor((monday.getTime()-first.getTime())/604800000)+1)+"주차";
}
const published= (raw:string)=>new Date(raw).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"});
const period=(i:Feed)=>i.periodStart.replaceAll("-",".")+" ~ "+i.periodEnd.replaceAll("-",".");
const issueKey=(i:Feed)=>i.generatedAt+"|"+i.periodStart+"|"+i.periodEnd;
export default function Dashboard({data,archives=[]}:{data:Feed;archives?:Feed[]}){
 const [section,setSection]=useState<"cert"|"fcm">("cert");
 const [selected,setSelected]=useState(issueKey(data));
 const [query,setQuery]=useState("");
 const [region,setRegion]=useState("전체");
 const [allArchives,setAllArchives]=useState(false);
 const [archiveSearch,setArchiveSearch]=useState("");
 const issueList=useMemo(()=>[data,...archives].filter((i,idx,arr)=>arr.findIndex(j=>issueKey(j)===issueKey(i))===idx).sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt)),[data,archives]);
 const current=issueList.find(i=>issueKey(i)===selected)||issueList[0];
 const latest=issueKey(current)===issueKey(issueList[0]);
 const cert=current.items||[];
 const fcm=current.fcmItems||[];
 const items=section==="cert"?cert:fcm;
 const matches=useMemo(()=>items.filter(item=>(region==="전체"||item.region===region)&&[item.title,item.titleKo,item.summary,item.summaryKo,item.source,item.category,item.region].join(" ").toLocaleLowerCase().includes(query.toLocaleLowerCase())),[items,region,query]);
 const feature=matches.slice(0,3);
 const activeCountries=new Set([...cert,...fcm].map(x=>x.region)).size;
 const shownArchives=issueList.filter(i=>(issueLabel(i.generatedAt)+" "+published(i.generatedAt)+" "+period(i)).includes(archiveSearch));
 function changeIssue(next:Feed){setSelected(issueKey(next));setRegion("전체");setQuery("");window.scrollTo({top:0,behavior:"smooth"});}
 function goLatest(){changeIssue(issueList[0]);}
 return <div className="site">
  <header className="topbar"><div className="topbar-inner">
   <a className="brand" href="/" aria-label="Weekly CERTI 홈"><span className="brand-symbol" aria-hidden="true"><i/><i/></span><span className="brand-words"><strong>Weekly <em>CERTI</em></strong><small>Global Certification & Regulatory Intelligence</small></span></a>
   <nav className="main-nav" aria-label="주 메뉴"><a href="#issues">홈</a><a href="#updates" onClick={()=>setSection("cert")}>전기·전자 인증</a><a href="#updates" onClick={()=>setSection("fcm")}>식품접촉 재질 FCM</a><a href="#archive">Archive</a></nav>
   <a href="#updates" className="header-search" aria-label="기사 검색">⌕</a>
  </div></header>
  <section className="hero" id="issues"><div className="hero-inner"><div className="hero-copy">
    <div className="hero-eyebrow">GLOBAL REGULATORY INTELLIGENCE · WEEKLY BRIEFING</div>
    <h1>Weekly CERTI</h1><h2>글로벌 인증·규제 동향 주간 레터</h2>
    <p>전기·전자 제품과 식품접촉 재질(FCM)의 주요 인증·규제 변경 사항을 매주 모아 전달합니다.</p>
   </div><div className="hero-art" aria-hidden="true"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><span className="globe"/><span className="glow-node node-one"/><span className="glow-node node-two"/><span className="glow-node node-three"/></div></div></section>
  <main className="page-container">
   <section className="issue-summary" aria-label="발행호 요약"><div className="issue-date-panel"><span className="eyebrow-tag">{latest?"최신호":"과거 발행호"}</span><h2>{issueLabel(current.generatedAt)}</h2><p>발행일 {published(current.generatedAt)} <span>·</span> 수집 기간 {period(current)}</p>{!latest&&<button className="text-action" onClick={goLatest}>최신호로 돌아가기 ↗</button>}</div>
    <div className="stat-grid"><button className={"stat-card cert-stat "+(section==="cert"?"selected":"")} onClick={()=>setSection("cert")}><span className="stat-icon" aria-hidden="true">⌁</span><span>전기·전자 인증</span><strong>{cert.length}<small>건</small></strong></button><button className={"stat-card fcm-stat "+(section==="fcm"?"selected":"")} onClick={()=>setSection("fcm")}><span className="stat-icon" aria-hidden="true">◈</span><span>식품접촉 재질 FCM</span><strong>{fcm.length}<small>건</small></strong></button></div>
    <div className="summary-insights"><div className="summary-insights-title"><span>▤</span> 이번 호 현황</div><p>총 <strong>{cert.length+fcm.length}건</strong>의 규제 관련 소식</p><p>기사에 분류된 국가·지역 <strong>{activeCountries}곳</strong></p><p className="summary-small">기사 수는 수집·검증된 데이터 기준입니다.</p></div>
   </section>
   <div className="main-columns">
    <div className="primary-column">
     <section className="feed-panel" id="updates">
      <div className="domain-tabs" role="tablist" aria-label="모니터링 분야"><button type="button" role="tab" aria-selected={section==="cert"} className={section==="cert"?"active":""} onClick={()=>{setSection("cert");setRegion("전체");setQuery("");}}>⌁ <span>전기·전자 인증 ({cert.length})</span></button><button type="button" role="tab" aria-selected={section==="fcm"} className={section==="fcm"?"active":""} onClick={()=>{setSection("fcm");setRegion("전체");setQuery("");}}>◈ <span>식품접촉 재질 FCM ({fcm.length})</span></button></div>
      <div className="feed-tools"><label className="feed-search"><span aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="기사·규제·규격 검색" aria-label="기사 검색"/></label><label className="region-select">국가·지역 <select value={region} onChange={e=>setRegion(e.target.value)}>{regions.map(r=><option key={r}>{r}</option>)}</select></label></div>
      <div className="feed-heading"><div><span className="section-kicker">REGULATORY UPDATES</span><h2>{section==="cert"?"전기·전자 인증 동향":"식품접촉 재질 동향"}</h2></div><span className="count-label">{matches.length}건</span></div>
      {matches.length===0?<div className="empty-state"><span className="empty-mark" aria-hidden="true">{section==="cert"?"⌁":"◈"}</span><strong>{query||region!=="전체"?"검색 조건에 맞는 기사가 없습니다.":"이번 호에 해당 분야의 신규 소식이 없습니다."}</strong><p>{query||region!=="전체"?"검색어나 국가 필터를 변경해 주세요.":"규제 변경이 없다고 확정하는 의미는 아니며, 이번 수집에서 채택된 기사가 없습니다."}</p></div>:
      <div className="news-list">{matches.map((item,idx)=><article className="news-item" key={item.id+"-"+idx}><div className="news-num">{String(idx+1).padStart(2,"0")}</div><div className="news-main"><div className="news-tags"><span className="region-tag">{item.region}</span><span>{item.category}</span><span>{item.date}</span></div><h3><a href={item.url} target="_blank" rel="noopener noreferrer">{item.titleKo||item.title}</a></h3><p>{item.summaryKo||item.summary}</p><div className="news-foot"><span>{item.source} · {item.sourceType==="official-direct"?"공식기관 수집":item.sourceType==="official-site-search"?"공식기관 사이트 검색":"뉴스 검색"}</span><a href={item.url} target="_blank" rel="noopener noreferrer">원문 보기 ↗</a></div></div></article>)}</div>}
     </section>
     <section className="coverage-panel"><div className="panel-heading"><div><span className="section-kicker">MONITORING COVERAGE</span><h2>국가별 인증 모니터링</h2></div></div><div className="coverage-grid">{(section==="cert"?[["미국","UL"],["EU","CE · EMC · ErP · RoHS"],["한국","KC"],["중국","CCC · CNCA"],["일본","PSE"],["국제","IEC · ISO · IECEE"],["기타","기타 국가"]]:[["미국","FDA · FCS"],["EU","EU 10/2011 · EFSA"],["한국","MFDS · 기구·용기·포장"],["중국","GB 4806"],["일본","식품위생법"],["국제","FCM 국제 규정"]]).map(([country,name])=><div className="coverage-item" key={country}><strong>{country}</strong><span>{name}</span><small>{items.filter(i=>i.region===country).length}건</small></div>)}</div><p className="coverage-disclaimer">국가별 수집 건수는 규제의 실제 시행 여부를 의미하지 않습니다. 구체적인 시행일과 법적 효력은 공식 원문을 확인해 주세요.</p></section>
    </div>
    <aside className="sidebar" id="archive"><section className="archive-panel"><div className="side-heading"><div><span className="section-kicker">ISSUE LIBRARY</span><h2>지난 레터 보기 <span>Archive</span></h2></div><span aria-hidden="true">▤</span></div><label className="archive-filter"><input placeholder="발행 월·주차 검색" aria-label="발행호 검색" value={archiveSearch} onChange={e=>{setArchiveSearch(e.target.value);setAllArchives(true)}}/></label><div className="archive-list">{(allArchives||archiveSearch?shownArchives:shownArchives.slice(0,7)).map(entry=><button key={issueKey(entry)} type="button" className={"archive-item "+(issueKey(entry)===issueKey(current)?"active":"")} onClick={()=>changeIssue(entry)}><span className="archive-item-main"><strong>{issueLabel(entry.generatedAt)}</strong><small>{published(entry.generatedAt)} 발행</small></span><span className="archive-item-right">{issueKey(entry)===issueKey(issueList[0])?<b>최신호</b>:null}<span aria-hidden="true">›</span></span></button>)}</div>{shownArchives.length>7&&!archiveSearch&&<button type="button" className="archive-more" onClick={()=>setAllArchives(v=>!v)}>{allArchives?"접기":"전체 발행호 보기"} ↓</button>}{shownArchives.length===0&&<p className="archive-no-results">일치하는 발행호가 없습니다.</p>}</section><section className="schedule-panel"><span className="section-kicker">PUBLICATION SCHEDULE</span><h3>매주 월요일 오전 8시</h3><p>직전 월요일부터 일요일까지의 글로벌 인증·FCM 동향을 주간 레터로 발행합니다.</p></section></aside>
   </div>
  </main>
  <footer className="site-footer"><div className="footer-inner"><div><strong>Weekly <span>CERTI</span></strong><p>Global Certification & Regulatory Intelligence</p></div><small>본 서비스는 정보 제공 목적이며 법적 해석이나 인증 판정을 대체하지 않습니다.</small></div></footer>
 </div>;
}
