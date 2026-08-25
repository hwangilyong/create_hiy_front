# create_hiy_front

`create_hiy_front`는 HIY 프론트엔드 초기 템플릿을 선택해서 새 프로젝트를 만들어주는 경량 CLI입니다.

현재는 아래 두 템플릿을 제공합니다.

| 선택 | 템플릿 | 용도 |
| --- | --- | --- |
| 지도 사용 안 함 | `hwangilyong/react_init_agent` | React 19 + Vite + TypeScript + FSD 기반 일반 프론트엔드 |
| OpenLayers | `hwangilyong/react_ol_init` | React + OpenLayers Controller/Event/Layer 아키텍처 기반 GIS 프론트엔드 |

## 바로 실행

npm에 게시하기 전에는 GitHub 저장소를 직접 `npx`로 실행할 수 있습니다.

```bash
npx github:hwangilyong/create_hiy_front
```

대화형으로 실행하면 다음 항목을 선택합니다.

```text
프로젝트 이름: hiy-front-app

지도 기능을 사용하시겠습니까?
  1) 지도 사용 안 함 - React 일반 템플릿
  2) OpenLayers - React + OpenLayers 템플릿

Package manager를 선택해주세요.
  1) npm
  2) pnpm
  3) yarn
  4) bun

의존성을 지금 설치할까요? (Y/n)
새 Git 저장소로 초기화할까요? (Y/n)
```

선택 결과는 다음처럼 연결됩니다.

```text
Map = none
  -> hwangilyong/react_init_agent

Map = openlayers
  -> hwangilyong/react_ol_init
```

## 명령형 사용

질문 없이 옵션으로도 실행할 수 있습니다.

```bash
# 일반 React
npx github:hwangilyong/create_hiy_front my-app --map none

# React + OpenLayers
npx github:hwangilyong/create_hiy_front gis-app --map openlayers

# 템플릿 ID 직접 선택
npx github:hwangilyong/create_hiy_front gis-app --template react-ol

# pnpm 사용 + 설치는 나중에
npx github:hwangilyong/create_hiy_front gis-app \
  --map openlayers \
  --package-manager pnpm \
  --skip-install

# Git 초기화 생략
npx github:hwangilyong/create_hiy_front my-app --no-git
```

등록된 템플릿은 아래 명령으로 확인할 수 있습니다.

```bash
npx github:hwangilyong/create_hiy_front --list
```

## 옵션

```text
--template <react|react-ol>       사용할 템플릿을 직접 선택
--map <none|openlayers>           지도 사용 여부로 템플릿 선택
--package-manager <name>          npm | pnpm | yarn | bun
--skip-install                    의존성 설치 생략
--git                             Git 저장소 초기화
--no-git                          Git 저장소 초기화 생략
-y, --yes                         질문 없이 기본값 사용
--list                            등록된 템플릿 목록 출력
-v, --version                     버전 출력
-h, --help                        도움말 출력
```

`--yes`만 사용하면 기본값은 다음과 같습니다.

- 프로젝트 이름: `hiy-front-app`
- 템플릿: `react`
- 지도: 사용 안 함
- package manager: `npm`
- 의존성 설치: 수행
- Git 초기화: 수행

## Private 템플릿 인증

현재 연결된 `react_init_agent`, `react_ol_init` 저장소가 private이면 해당 저장소에 접근할 수 있는 GitHub 인증이 필요합니다.

CLI는 우선 GitHub CLI(`gh`)를 사용하고, 사용할 수 없으면 HTTPS `git clone`을 시도합니다.

권장 방식:

```bash
gh auth login
gh auth status
```

인증 정보나 토큰은 `create_hiy_front`에 저장하지 않습니다.

## 프로젝트 생성 과정

```text
create_hiy_front
  -> 템플릿 선택
  -> GitHub에서 템플릿 shallow clone
  -> .git 제거
  -> 새 프로젝트 폴더로 복사
  -> package.json name 재설정
  -> 기존 lockfile 제거
  -> .env.example이 있으면 .env.local 생성
  -> 선택한 package manager로 install
  -> 선택 시 git init
```

템플릿의 기존 Git history는 새 프로젝트로 복사되지 않습니다.

## 템플릿 Registry

템플릿 정의는 `src/templates.js` 한 곳에서 관리합니다.

```js
{
  id: 'react-ol',
  name: 'React + OpenLayers Starter',
  map: 'openlayers',
  repository: 'hwangilyong/react_ol_init',
  ref: 'main'
}
```

향후 Cesium이나 MapLibre를 추가할 때 CLI 흐름을 새로 만들 필요 없이 Registry에 항목을 추가하면 됩니다.

예:

```js
{
  id: 'react-cesium',
  name: 'React + Cesium Starter',
  map: 'cesium',
  repository: 'hwangilyong/react_cesium_init',
  ref: 'main'
}
```

그러면 지도 선택 항목도 Registry에서 자동 생성됩니다.

## 개발

Node.js 20 이상이 필요합니다.

```bash
npm test
```

로컬에서 CLI를 직접 실행하려면:

```bash
node ./bin/create-hiy-front.js --help
node ./bin/create-hiy-front.js --list
```

## npm 게시 후

npm에 `create-hiy-front` 이름으로 게시하면 다음처럼 더 짧게 사용할 수 있습니다.

```bash
npx create-hiy-front
```
