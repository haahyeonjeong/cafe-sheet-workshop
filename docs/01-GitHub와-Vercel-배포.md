# 1. GitHub에 올리고 Vercel에 배포하기

## 시작 전에
GitHub와 Vercel에 로그인합니다. Git 명령으로 푸시하려면 PC의 Git 설치와 GitHub 인증도 끝내 둡니다. 저장소 이름은 예를 들어 `cafe-sheet-workshop`으로 정합니다. 기존 수업 자료가 들어 있는 폴더가 아닌, 이 ZIP을 푼 폴더에서 시작합니다.

## 1단계. 압축 풀기
1. ZIP을 모두 풉니다. Windows에서 확장자 표시를 켜고 ZIP 안에서 바로 작업하지 않습니다.
2. `package.json`, `vercel.json`, `public`, `api`, `lib`가 함께 보이는 폴더가 프로젝트 루트입니다.
3. `public` 폴더만 올리지 않습니다. Google 저장에 필요한 서버 코드가 빠집니다.
4. 인증키 파일과 `.env.local`이 들어 있지 않은지 확인합니다.

## 2단계. GitHub 저장소 만들기
1. [GitHub의 새 저장소 화면](https://github.com/new)을 엽니다.
2. 본인 계정에 새 저장소를 만듭니다. Public 또는 Private 중 연수 안내에 맞게 선택합니다.
3. 명령어로 푸시할 때는 README·라이선스·`.gitignore`의 자동 생성을 선택하지 않습니다. ZIP에 README와 `.gitignore`가 이미 있습니다.
4. 생성한 저장소의 HTTPS 주소를 복사합니다.

## 3단계. 파일 커밋·푸시
프로젝트 루트에서 터미널을 열고 순서대로 실행합니다. `<내 저장소 HTTPS 주소>`는 꺾쇠까지 지우고 실제 주소로 바꿉니다.

```powershell
git init -b main
git status
git add .
git diff --cached --stat
git commit -m "실습: 카페 주문 화면 추가"
git remote add origin <내 저장소 HTTPS 주소>
git push -u origin main
```

Git 사용자 이름·이메일이 없다는 오류가 나면 이 저장소에서 사용할 본인 정보를 설정한 뒤 커밋부터 다시 실행합니다. 공개 커밋의 이메일이 걱정되면 GitHub 설정에 표시되는 본인의 비공개 커밋 이메일을 사용합니다. GitHub 로그인이나 인증 창은 본인이 직접 처리합니다.

Codex를 이용할 때에는 압축을 푼 폴더를 프로젝트로 열고, **방금 만든 본인의 저장소 주소를 명시해** 이번 파일을 커밋·푸시하라고 요청합니다. 인증키를 채팅에 넣지 않습니다. 요청에 기본 브랜치 `main`에 첫 실습 파일을 올리려는 목적을 분명히 적습니다. 이미 사용 중인 저장소나 기존 `main`을 덮어쓰지 않습니다.

### Git 설치가 막혔을 때의 대체 방법
GitHub 새 저장소의 `uploading an existing file` 또는 `Add file → Upload files`를 이용해 파일·폴더를 올릴 수 있습니다. 이 경우 Git 푸시 실습은 생략된 것이므로 별도로 구분합니다. 숨김 파일이 누락될 수 있어 `.gitignore`는 특히 확인합니다. 실제 키 파일은 어떤 방식으로도 올리지 않습니다.

## 4단계. Vercel과 GitHub 연결
1. [Vercel 새 프로젝트](https://vercel.com/new)에서 `Import Git Repository`를 선택합니다.
2. GitHub 연결이 필요하면 실습 저장소에 대한 접근을 승인합니다. 불필요한 다른 저장소까지 접근을 넓히지 않습니다.
3. 방금 만든 저장소에서 `Import`를 누릅니다.
4. 아래 항목을 확인합니다. 저장소의 `vercel.json`이 설정을 제공합니다.

| 항목 | 값 |
|---|---|
| Framework Preset | `Other` |
| Root Directory | 프로젝트 루트. `public`을 고르지 않습니다. |
| Build Command | 별도 빌드 없음. 비워 둡니다. |
| Output Directory | `public` |
| Node.js | `22.x` |
| Environment Variables | 첫 배포에서는 비워 둡니다. |

5. `Deploy`를 누르고 배포가 끝나면 발급된 주소를 엽니다.
6. Production Branch가 `main`인지 확인합니다. 현재 UI에서 Git 또는 Environments 설정에 표시될 수 있습니다.
7. 화면에 **체험 모드**가 표시되는지 확인합니다.
8. 메뉴를 담고 별칭을 입력한 뒤 체험 주문을 합니다. 완료창에 **시트에 저장되지 않았음**이 표시되면 첫 배포 실습이 끝난 것입니다.

## 5단계. 수정·재푸시·자동 배포 확인
1. `public/catalog.js`의 첫 메뉴 설명 한 곳을 바꿉니다.
2. 로컬 화면 또는 변경 비교로 수정한 내용을 확인합니다.
3. 이번 연습 저장소의 `main`에 수정 내용을 올립니다.

```powershell
git add public/catalog.js
git commit -m "실습: 메뉴 설명 수정"
git push origin main
```

4. Vercel `Deployments`에서 새 커밋의 배포가 생기는지 확인합니다.
5. `Ready`가 되면 운영 주소를 새로 열어 바꾼 문구를 확인합니다. 배포 화면의 브랜치와 커밋이 GitHub의 원격 `main`과 같은지도 확인합니다.

이 명령은 이 자료로 만든 개인 연습 저장소에서 `main` 수정 실습을 하려는 경우입니다. 협업 저장소에서는 작업 브랜치에 푸시해 Preview에서 확인한 뒤 `main`으로 병합합니다. 운영 배포는 `main`을 기준으로 유지하고 작업 브랜치를 `--prod`로 우회 배포하지 않습니다.

다음 단계: [Google Sheets API 연결](02-Google-Sheets-API-연결.md)

근거: [Vercel Git 연결](https://vercel.com/docs/git), [빌드 설정](https://vercel.com/docs/builds/configure-a-build), [Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js)
