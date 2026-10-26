# 카페 주문 · GitHub → Vercel → Google Sheets 실습

**외부 DB·서버·계정과 연결되지 않은 실습 파일입니다.** ZIP을 풀면 `package.json`과 `AGENTS.md`가 바로 보입니다. 이 최상위 폴더를 Codex 프로젝트로 열고 다음과 같이 요청하세요.

> 로컬로 연결해봐

Codex가 로컬 서버를 실행하고 브라우저에서 메뉴와 체험 주문을 확인합니다. 코드 생성·라이브러리 설치·인증키 입력은 필요 없습니다. PC에 Node.js 22 이상이 있어야 하며, PATH에 없으면 Codex가 제공된 런타임 도구로 기존 설치 경로를 확인합니다.

로컬 실행은 `.env` 파일과 기존 Google 연결 환경 변수를 사용하지 않습니다. 체험 주문은 외부에 저장되지 않습니다. 이후 GitHub·Vercel·Google 시트 연결은 아래 안내서로 직접 연습합니다.

1. [처음 배포하기](docs/01-GitHub와-Vercel-배포.md)
2. [주문 내역을 Google 시트에 저장하기](docs/02-Google-Sheets-API-연결.md)
3. [연수 진행과 확인 과제](docs/03-연수-진행안.md)
4. [오류 해결](docs/04-오류-해결.md)

예제 매장: 읍천리382 오산1호점. [네이버 지도에서 매장 보기](https://map.naver.com/p/search/%EC%9D%8D%EC%B2%9C%EB%A6%AC382%20%EC%98%A4%EC%82%B01%ED%98%B8%EC%A0%90)

메뉴·가격은 **실습용 예시**입니다. 실제 매장에 주문을 보내거나 결제하지 않습니다. 실명·연락처를 입력하지 마세요.

실제 메뉴 사진이 포함된 [주문 화면 미리보기](docs/주문화면.png)와 [모바일 화면](docs/주문화면-모바일.png)을 볼 수 있습니다.

## 이후 연수생이 연결할 구조

```text
브라우저의 주문 화면
    ↓ 메뉴 ID·옵션·수량·별칭
Vercel의 /api/orders (가격 검증·Google 인증)
    ↓ Google Sheets API
각 연수생의 비공개 스프레드시트
```

| 파일 | 용도 |
|---|---|
| `public/catalog.js` | 매장·메뉴·예시 가격. 수정 실습은 이 파일부터 시작합니다. |
| `public/images/` | 참고 사이트에서 확인한 실제 메뉴 사진 8장. ZIP에 포함되어 함께 배포됩니다. |
| `public/index.html`, `styles.css`, `app.js` | 주문 화면 |
| `api/config.js`, `api/orders.js` | Vercel 서버 함수 |
| `lib/` | 주문 검증·서비스 계정 인증·시트 저장 |
| `vercel.json` | 바로 배포하기 위한 설정 |
| `.env.example` | 환경 변수의 이름과 설명. 실제 키는 들어 있지 않습니다. |
| `docs/주문내역-머리글.csv` | 시트 A1:H1에 넣을 8개 머리글 |

## 직접 명령어로 로컬 실행하기

Node.js 22.9 이상이 설치된 PC에서 압축을 푼 폴더의 터미널을 열고 실행합니다. 배포 환경은 Node.js 22.x로 지정되어 있습니다.

```powershell
npm start
```

터미널에 나온 주소를 엽니다. 기본값은 `http://127.0.0.1:4173`이며 사용 중이면 다음 빈 포트를 선택합니다. 종료는 터미널에서 `Ctrl+C`입니다. `npm install`은 필요하지 않습니다. `index.html`을 직접 더블 클릭하면 모듈·API를 불러올 수 없으므로 이 방법이나 Vercel 주소를 사용합니다.

로컬 실행 중 `public/catalog.js`의 메뉴명·가격을 바꾸면 서버도 `Ctrl+C`로 종료한 뒤 `npm start`로 다시 실행합니다. 서버가 시작할 때 읽은 메뉴와 화면이 일치하도록 하기 위한 절차입니다. Vercel에서는 새 커밋 배포 때 서버 코드도 함께 갱신됩니다.

```powershell
npm run check
npm test
```

## 보관과 보안

서비스 계정 JSON 파일은 **이 폴더 밖**에 보관합니다. GitHub·채팅·HTML·`public/`에 키를 붙여 넣지 않습니다. `.gitignore`는 package.json·package-lock.json·vercel.json을 제외한 JSON 파일을 기본 제외합니다. 다른 파일 형식에 붙여 넣은 키나 GitHub 웹 업로드까지 막지는 못하므로, 올리기 전 파일 목록을 직접 확인합니다.

이 자료는 소규모 연수용입니다. 공유 실습 코드는 정식 사용자 인증이 아니며, 공개 주소의 요청을 완전히 막지는 못합니다. Sheets에는 원자적 중복 방지나 데이터베이스 트랜잭션이 없습니다. 실제 주문·결제·대규모 수집에는 별도 인증과 데이터베이스가 필요합니다.

검증 범위와 한계는 [검증 기록](docs/검증-기록.md)에 적었습니다.
