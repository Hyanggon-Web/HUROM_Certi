# CertScope Weekly

전기전자·가전 제조기업을 위한 글로벌 인증 규제 주간 브리핑.

## 배포
Vercel에서 `Hyanggon-Web/HUROM_Certi` 저장소를 Import하고 Next.js로 배포합니다.

## 주간 수집
GitHub Actions `Weekly certification update`는 매주 월요일 오전 8시(KST, 일요일 23:00 UTC)에 예약 실행됩니다. Actions에서 수동 실행할 수도 있습니다. 결과는 `data/latest.json`과 `data/archive/`에 저장됩니다.

현재 자동 수집은 미국 Federal Register FCC·DOE RSS 2개만 연결되어 있습니다. EU·KC·CCC·PSE 자동 수집과 AI 요약·검증은 아직 구현되지 않았습니다. 규제 시행일과 적용 범위는 반드시 공식 원문으로 확인하세요.

## 로컬 실행
`npm install` 후 `npm run dev`
