// Conservative publication filter: retain only explicit changes to standards or certification rules.
const standard=/\b(?:UL\s*\d{3,}|IEC\s*\d{3,}|ISO\s*\d{3,}|EN\s*\d{3,}|IECQ|IECEE|RoHS|ErP|EMC|CCC|CNCA|PSE|DENAN|KC|BIS|SNI|CB Scheme)\b|CE marking|electrical appliances?|electrical safety|product safety|전기용품|안전기준|안전인증|국가기술표준원|강제인증|强制性产品认证|电气安全|电器|電気用品|技術基準/i;
const change=/\b(?:amend(?:ment|ed)?|revis(?:ion|ed|es)?|updat(?:e|ed)|new edition|new standard|published|publication|effective|enforc(?:ement|ed)|mandatory|requirement changes?|transition period|withdraw(?:al|n)|scope|clarif(?:y|ies|ication)|rule changes?|regulation changes?)\b|개정|제정|폐지|고시|공고|시행|변경|신설|강화|입법예고|행정예고|예고|적용범위|修订|修正|实施|公告|发布|新版|调整|改正|施行|公布|新規/i;
const exclude=/conference|investor|earnings|financial results|stock|shares|market growth|showcase|milestone|supplier|why certification matters|training|webinar|event\s*[-–]|newsletter|travel advice|fire danger|vape|election|boxing day|firearms|licen[cs]ing services|solar secures|CCTV|J\.P\. Morgan|service outage|plumbing laboratory/i;
export function isRegulatoryChange(item){
 const title=String(item.title||"").replace(/\s+-\s+[^-]{2,100}$/,"");
 return standard.test(title)&&change.test(title)&&!exclude.test(title);
}
