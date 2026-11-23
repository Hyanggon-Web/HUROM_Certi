import Dashboard from "./dashboard";
import latest from "../data/latest.json";
import issueNov16 from "../data/archive/2026-11-16.json";
import issueNov17 from "../data/archive/2026-11-17.json";
export default function Page(){
 return <Dashboard data={latest} archives={[latest,issueNov17,issueNov16]}/>;
}
