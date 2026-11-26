// Electrical / electronic certification: require a regulatory subject and an actual change.
// Search is deliberately broad; publication remains conservative.
const subject=/\b(?:UL(?:\s*Solutions|\s*\d{3,})?|IEC\s*\d{3,}|ISO\s*\d{3,}|EN\s*\d{3,}|IECEE|CB\s*Scheme|RoHS|ErP|EMC|CCC|CNCA|PSE|DENAN|KC|BIS|SNI|INMETRO|EESS|RCM)\b|CE marking|conformity assessment|ecodesign|energy labelling|energy efficiency|electrical appliances?|electrical safety|electronic equipment|product safety|electromagnetic compatibility|전기\s*용품|전기안전|안전기준|안전인증|국가기술표준원|强制性产品认证|电器|电气安全|认证实施规则|電気用品|技術基準|電気用品安全法|peralatan listrik|thiết bị điện/i;
const change=/\b(?:amend(?:ment|ed|ing)?|revis(?:ion|ed|es|ing)?|updat(?:e|ed|ing)?|new edition|new standard|first edition|published|publication|effective|enforc(?:ement|ed)?|mandatory|implementation|transition period|withdraw(?:al|n)?|replac(?:e|ed|ement)|adopt(?:ed|ion)|exemption|harmonised standard|harmonized standard|consultation|draft regulation|proposed rule|notification|regulatory decision|directive\s*\d+|regulation\s*\(EU\))\b|개정|제정|폐지|고시|공고|시행|변경|신설|강화|입법예고|행정예고|修订|修正|实施|公告|发布|新版|调整|改正|施行|公布|新規|改訂|更新|適用|義務化|改正案|sửa đổi|cập nhật|ban hành|revisi|perubahan/i;
const exclude=/conference|investor|earnings|financial results|stock|shares|market growth|showcase|milestone|supplier|why certification matters|training|webinar|event\s*[-–]|newsletter|travel advice|fire danger|vape|election|boxing day|firearms|licen[cs]ing services|solar secures|CCTV|J\.P\. Morgan|service outage|plumbing laboratory|consumer review|product launch|sales growth/i;
export function regulatoryRejectReason(item){
 const title=String(item.title||"").replace(/\s+-\s+[^-]{2,100}$/,"");
 const summary=String(item.summary||"");
 const body=title+" "+summary;
 if(exclude.test(title))return "비규제·홍보성 자료";
 if(!subject.test(body))return "인증·전기전자 관련성 불충분";
 if(!change.test(body))return "규격 또는 규제 변경 신호 없음";
 // Do not treat broad generic mentions alone as actual rule changes.
 const titleHasChange=change.test(title);
 const official=item.sourceType==="official-direct"||item.sourceType==="official-site-search";
 if(!titleHasChange&&!official&&summary.length<35)return "변경 정보의 근거 부족";
 return null;
}
export function isRegulatoryChange(item){return regulatoryRejectReason(item)===null}
