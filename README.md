# create_hiy_starter

`create_hiy_starter`는 HIY 프로젝트 초기 템플릿을 선택해서 새 프로젝트를 만드는 범용 Starter CLI입니다.

현재는 프론트엔드 템플릿을 제공하며, 향후 Spring Boot/Kotlin 등 서버 템플릿도 같은 Registry에 추가할 수 있도록 설계합니다.

## 현재 stable 템플릿

| Kind | ID | Stable | Repository |
| --- | --- | --- | --- |
| frontend | `react` | `0.1.0` | `hwangilyong/react_init_agent` |
| frontend | `react-ol` | `0.2.0` | `hwangilyong/react_ol_init` |

기본 생성은 `main`이 아니라 Registry에 지정된 stable tag를 사용합니다.

```text
react      -> v0.1.0
react-ol   -> v0.2.0
```

따라서 템플릿 저장소의 `main`이 변경되어도 이미 생성된 프로젝트와 새 프로젝트의 stable 기준이 임의로 바뀌지 않습니다.

## 바로 실행

```bash
npx github:hwangilyong/create_hiy_starter
```

## 버전 선택

버전을 생략하면 해당 템플릿의 stable 버전을 사용합니다.

```bash
# 최신 stable React Starter
npx github:hwangilyong/create_hiy_starter my-app --template react

# 특정 버전 고정
npx github:hwangilyong/create_hiy_starter my-app --template react@0.1.0

# 동일한 표현
npx github:hwangilyong/create_hiy_starter my-app \
  --template react \
  --template-version 0.1.0

# OpenLayers stable
npx github:hwangilyong/create_hiy_starter gis-app --template react-ol
```

등록된 템플릿과 stable/지원 버전은 다음 명령으로 확인합니다.

```bash
npx github:hwangilyong/create_hiy_starter --list
```

## 지도 기준 선택

```bash
# 일반 React stable
npx github:hwangilyong/create_hiy_starter my-app --map none

# React + OpenLayers stable
npx github:hwangilyong/create_hiy_starter gis-app --map openlayers
```

## 주요 옵션

```text
--template <id[@version]>          템플릿과 특정 버전 선택
--template-version <version>       템플릿 버전 직접 선택
--map <none|openlayers>            프론트엔드 지도 설정
--package-manager <name>           npm | pnpm | yarn | bun
--skip-install                     의존성 설치 생략
--git                              Git 저장소 초기화
--no-git                           Git 저장소 초기화 생략
-y, --yes                          질문 없이 기본값 사용
--list                             등록된 템플릿/버전 목록 출력
-v, --version                      create-hiy-starter CLI 버전 출력
-h, --help                         도움말 출력
```

## 생성 프로젝트의 버전 추적

생성된 프로젝트 루트에는 `.hiy-starter.json`이 만들어집니다.

```json
{
  "schemaVersion": 1,
  "starter": "create-hiy-starter",
  "template": {
    "id": "react-ol",
    "kind": "frontend",
    "version": "0.2.0",
    "repository": "hwangilyong/react_ol_init",
    "ref": "v0.2.0",
    "channel": "stable"
  }
}
```

이 파일은 향후 `check-update`, migration 등 템플릿 업데이트 도구의 기준으로 사용할 수 있습니다.

## 템플릿 Registry

버전 정보는 `src/templates.js`에서 관리합니다.

```js
{
  id: 'react-ol',
  kind: 'frontend',
  name: 'React + OpenLayers Starter',
  repository: 'hwangilyong/react_ol_init',
  stable: '0.2.0',
  versions: [
    { version: '0.2.0', ref: 'v0.2.0', channel: 'stable' }
  ]
}
```

새 템플릿 버전을 발행할 때는 기존 버전을 제거하지 않고 `versions`에 추가한 뒤, 검증이 끝난 버전만 `stable` 값을 변경합니다.

예:

```js
stable: '0.3.0',
versions: [
  { version: '0.2.0', ref: 'v0.2.0', channel: 'legacy' },
  { version: '0.3.0', ref: 'v0.3.0', channel: 'stable' }
]
```

## 템플릿 릴리스 정책

각 템플릿 저장소는 Semantic Versioning을 사용합니다.

```text
PATCH  설정/버그 수정
MINOR  호환 가능한 기능 추가
MAJOR  프로젝트 구조/사용 규약의 호환성 파괴 변경
```

템플릿 저장소에서는 다음 값이 일치해야 합니다.

```text
package.json version
=
hiy-template.json version
=
Git tag vX.Y.Z
```

`main`은 개발용이며 Starter Registry에서 직접 참조하지 않습니다.

## Private 템플릿 인증

private 저장소 접근 시 GitHub 인증이 필요합니다.

```bash
gh auth login
gh auth status
```

CLI는 `gh repo clone`을 먼저 사용하고 실패 시 HTTPS `git clone`을 시도합니다.

## 향후 Backend 확장

```js
{
  id: 'spring-kotlin',
  kind: 'backend',
  name: 'Spring Boot + Kotlin Starter',
  repository: 'hwangilyong/spring_kotlin_init',
  stable: '1.0.0',
  versions: [
    { version: '1.0.0', ref: 'v1.0.0', channel: 'stable' }
  ]
}
```

## 개발

```bash
npm test
node ./bin/create-hiy-starter.js --help
node ./bin/create-hiy-starter.js --list
```

Node.js 20 이상이 필요합니다.
