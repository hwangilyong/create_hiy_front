# AGENTS.md

## 목적

이 저장소는 여러 프론트엔드 초기 템플릿을 선택해 새 프로젝트를 생성하는 CLI입니다.

## 핵심 규칙

- 템플릿 선택 정보는 `src/templates.js`에서만 관리합니다.
- 특정 템플릿 Repository 이름을 `cli.js` 또는 `scaffold.js`에 하드코딩하지 않습니다.
- 지도 종류 추가 시 먼저 Registry에 새 항목을 추가하고 기존 선택 흐름을 재사용합니다.
- 생성된 프로젝트에는 원본 템플릿의 `.git` 디렉터리를 복사하지 않습니다.
- GitHub token, PAT, SSH key 등 인증정보를 코드나 설정파일에 저장하지 않습니다.
- private 템플릿 접근은 사용자의 `gh` 또는 Git credential 설정을 그대로 사용합니다.
- 생성 실패 시 오류 원인을 숨기지 말고, 인증/경로/실행파일 부족 여부를 구체적으로 안내합니다.
- Node.js 표준 라이브러리로 가능한 기능은 외부 런타임 의존성을 추가하지 않는 방향을 우선합니다.

## 변경 시 확인

```bash
npm test
node ./bin/create-hiy-front.js --help
node ./bin/create-hiy-front.js --list
```

새 템플릿을 추가했다면 다음도 확인합니다.

- `--template <id>`로 선택 가능
- `--map <map>`으로 선택 가능
- 대화형 지도 선택 목록에 자동 노출
- README의 템플릿 목록과 예시 갱신
