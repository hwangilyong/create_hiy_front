# AGENTS.md

## 목적

이 저장소는 HIY 프로젝트 초기 템플릿을 선택해 새 프로젝트를 생성하는 범용 Starter CLI입니다.

현재는 프론트엔드 템플릿을 제공하며, 향후 서버/백엔드 템플릿도 동일한 Registry 구조로 확장합니다.

## 핵심 규칙

- 템플릿 선택 정보와 배포 버전은 `src/templates.js`에서만 관리합니다.
- 템플릿은 `kind`로 상위 분류합니다. 현재 값은 `frontend`이며, 서버 템플릿은 `backend`를 사용합니다.
- Starter의 기본 생성 대상은 절대 `main`이 아닙니다. 검증된 stable tag만 사용합니다.
- 각 템플릿은 `stable`과 `versions[]`를 가지며, 기존에 배포한 version/ref를 임의로 삭제하거나 이동하지 않습니다.
- 특정 템플릿 Repository 이름을 `cli.js` 또는 `scaffold.js`에 하드코딩하지 않습니다.
- `map`은 프론트엔드 템플릿의 지도 엔진 구분에만 사용합니다.
- 지도 종류 추가 시 먼저 Registry에 새 항목을 추가하고 기존 선택 흐름을 재사용합니다.
- 생성된 프로젝트에는 원본 템플릿의 `.git` 디렉터리를 복사하지 않습니다.
- 생성된 프로젝트에는 `.hiy-starter.json`을 남겨 template id/version/repository/ref를 추적합니다.
- GitHub token, PAT, SSH key 등 인증정보를 코드나 설정파일에 저장하지 않습니다.
- private 템플릿 접근은 사용자의 `gh` 또는 Git credential 설정을 그대로 사용합니다.
- Node.js 표준 라이브러리로 가능한 기능은 외부 런타임 의존성을 추가하지 않는 방향을 우선합니다.

## 버전 등록 규칙

새 버전을 추가할 때는 기존 항목을 덮어쓰지 않고 `versions`에 추가합니다.

```js
stable: '0.3.0',
versions: [
  { version: '0.2.0', ref: 'v0.2.0', channel: 'legacy' },
  { version: '0.3.0', ref: 'v0.3.0', channel: 'stable' }
]
```

stable 변경은 해당 tag의 템플릿 CI가 성공한 뒤에만 수행합니다.

## 변경 시 확인

```bash
npm test
node ./bin/create-hiy-starter.js --help
node ./bin/create-hiy-starter.js --list
```

버전 기능을 변경했다면 다음도 확인합니다.

- `--template <id>`가 stable 버전을 선택
- `--template <id>@<version>`이 특정 버전을 선택
- `--template-version <version>`이 동작
- 없는 버전 요청 시 명확한 오류 발생
- 생성 프로젝트에 `.hiy-starter.json` 생성

새 백엔드 템플릿은 `kind: 'backend'`로 등록하고 프론트엔드 전용 `map` 옵션에 의존하지 않습니다.
