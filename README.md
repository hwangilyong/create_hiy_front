# create_hiy_front

`create_hiy_front`는 HIY 프론트엔드 초기 템플릿을 선택해서 새 프로젝트를 만들어주는 경량 CLI입니다.

현재는 아래 두 템플릿을 제공합니다.

| 선택 | 템플릿 | 용도 |
| --- | --- | --- |
| 지도 사용 안 함 | `hwangilyong/react_init_agent` | React 19 + Vite + TypeScript + FSD 기반 일반 프론트엔드 |
| OpenLayers | `hwangilyong/react_ol_init` | React + OpenLayers Controller/Event/Layer 아키텍처 기반 GIS 프론트엔드 |

## 바로 실행

```bash
npx github:hwangilyong/create_hiy_front
```

대화형 실행 시 프로젝트/지도/package manager와 함께 Storybook AI Review addon 포함 여부를 선택할 수 있습니다.

## Storybook AI Review

`hwangilyong/storybook_addon`을 생성 프로젝트에 선택적으로 주입할 수 있습니다.

```bash
npx github:hwangilyong/create_hiy_front my-app --storybook-ai-review
```

선택하면 다음 항목이 자동 구성됩니다.

- `storybook`, `@storybook/react-vite` dev dependency
- `@hiy/storybook-addon-ai-review` GitHub dependency
- `better-sqlite3` dev dependency
- `storybook`, `build-storybook`, `ai-bridge` scripts
- `.storybook/main.ts`
- `.storybook/preview.ts`
- `.env.example`/`.env.local`의 `VITE_HIY_AI_REVIEW_ENDPOINT` (기본값 `http://127.0.0.1:4700/review`)
- `tools/ai-bridge/` — review payload를 받아 CLI 코딩 에이전트를 실행하는 로컬 브리지 서버
- `.hiy-ai-review/` — AI Job/Lock/History/Comment 상태가 저장되는 로컬 SQLite 영역이며 `.gitignore`에 자동 추가

실행:

```bash
npm run storybook      # http://localhost:6006
npm run ai-bridge      # http://127.0.0.1:4700, 기본은 dry-run
```

Storybook toolbar의 `AI Review`를 켠 뒤 Canvas의 요소를 클릭하면 selector, text, attributes, bounding box, 가능한 경우 React source 위치가 수집됩니다. Panel에서 여러 코멘트를 작성한 뒤 `Send to AI`를 한 번 누르면 해당 Story 기준으로 하나의 AI Job이 생성됩니다.

```text
Story
  -> Comments N개
  -> Send to AI 1회
  -> Job 1개
  -> Targets N개
  -> 파일 Lock 획득
  -> CLI 1회 실행
  -> Source 수정
  -> Cache reset
  -> History 저장
```

복합 Story에서 여러 하위 컴포넌트에 코멘트가 달린 경우 각 코멘트의 `target.source.fileName`을 기준으로 수정 대상 파일을 수집합니다. 따라서 하나의 Story Job이 여러 Target 파일을 가질 수 있습니다.

```text
DemoProfileCard Story
  -> DemoAvatar.tsx
  -> DemoUserInfo.tsx
  -> DemoActionButton.tsx

= Job 1개 / Target 3개
```

브릿지는 Job 실행 전에 모든 Target 파일에 Lock을 원자적으로 획득합니다. 하나라도 다른 AI Job이 사용 중이면 전체 Job을 `blocked` 상태로 전환하고 실제 CLI 실행은 시작하지 않습니다. Storybook의 background job UI에서 `Retry` 또는 `Delete`를 사용할 수 있습니다.

```text
queued   -> Delete 가능
blocked  -> Retry / Delete 가능
running  -> 실행 중이므로 Delete 불가
```

같은 Story의 요청은 Story queue에서 순차 처리되며, 다른 Story라도 동일 Target 파일을 사용하는 경우 file lock으로 충돌을 방지합니다. Job/Target/Comment/Lock/History 상태는 생성 프로젝트의 `.hiy-ai-review/ai-review.db` SQLite DB에 저장됩니다. 브릿지가 재시작되면 이전 프로세스의 Lock은 초기화되고 실행 중이던 Job은 안전하게 queued 상태로 복구됩니다.

AI 수정 성공 후에는 Vite/Storybook 개발 캐시를 정리하고, History에는 수정 전/후 source snapshot이 저장됩니다. 복합 Story는 여러 Target snapshot을 하나의 History 항목으로 관리하므로 Rollback도 Job 단위로 여러 파일을 함께 복원할 수 있습니다.

`ai-bridge`가 실제로 파일을 수정하게 하려면 `AI_BRIDGE_EXECUTE=1`과 `AI_EDIT_COMMAND`를 설정해야 합니다. 기본 상태는 dry-run이며 자세한 브리지 실행 방법과 안전장치는 생성된 프로젝트의 `tools/ai-bridge/README.md`를 참고하세요.

현재 addon 저장소가 private이므로 생성 프로젝트에서 의존성을 설치할 때 해당 저장소에 접근 가능한 GitHub 인증이 필요합니다.

## AI Review Demo 샘플

AI Review 기능을 바로 확인할 수 있는 샘플 컴포넌트와 Story만 추가하려면 `--storybook-ai-review-demo`를 사용합니다.

```bash
npx github:hwangilyong/create_hiy_front my-app --storybook-ai-review-demo
```

이 옵션은 가짜 AI 실행 모드를 만드는 옵션이 아닙니다. 실제 Storybook AI Review 설정을 활성화한 뒤 테스트용 source와 Story를 `src/ai-review-demo/`에 추가합니다.

```text
src/ai-review-demo/
├─ DemoAvatar.tsx
├─ DemoUserInfo.tsx
├─ DemoActionButton.tsx
├─ DemoProfileCard.tsx
└─ DemoProfileCard.stories.tsx
```

`DemoProfileCard`는 여러 하위 컴포넌트로 구성되어 있어 다음 흐름을 확인하기 위한 샘플입니다.

1. Storybook에서 `AI Review`를 켭니다.
2. Avatar, 사용자 정보, Action 버튼 등 서로 다른 영역에 각각 코멘트를 추가합니다.
3. `Send to AI`를 한 번 실행합니다.
4. 하나의 Job 안에서 여러 Target 파일이 수집되는지 확인합니다.
5. background jobs UI에서 `queued / running / blocked / completed` 상태를 확인합니다.
6. Lock 충돌 시 `Retry`/`Delete`, 완료 후 History/Rollback 흐름을 확인합니다.

대화형 실행에서는 Storybook AI Review를 선택한 경우 데모 Story 추가 여부도 별도로 선택할 수 있습니다.

## 명령형 사용

```bash
# 일반 React
npx github:hwangilyong/create_hiy_front my-app --map none

# React + OpenLayers
npx github:hwangilyong/create_hiy_front gis-app --map openlayers

# Storybook AI Review 포함
npx github:hwangilyong/create_hiy_front my-app --storybook-ai-review

# Storybook AI Review + 확인용 Demo Story
npx github:hwangilyong/create_hiy_front my-app --storybook-ai-review-demo

# Storybook AI Review 명시적 제외
npx github:hwangilyong/create_hiy_front my-app --no-storybook-ai-review

# pnpm 사용 + 설치는 나중에
npx github:hwangilyong/create_hiy_front gis-app \
  --map openlayers \
  --package-manager pnpm \
  --storybook-ai-review \
  --skip-install
```

## 옵션

```text
--template <react|react-ol>       사용할 템플릿을 직접 선택
--map <none|openlayers>           지도 사용 여부로 템플릿 선택
--package-manager <name>          npm | pnpm | yarn | bun
--storybook-ai-review             Storybook AI Review addon 포함
--storybook-ai-review-demo        AI Review addon + 확인용 Demo Story 포함
--no-storybook-ai-review          Storybook AI Review addon 제외
--skip-install                    의존성 설치 생략
--git                             Git 저장소 초기화
--no-git                          Git 저장소 초기화 생략
-y, --yes                         질문 없이 기본값 사용
--list                            등록된 템플릿 목록 출력
-v, --version                     버전 출력
-h, --help                        도움말 출력
```

`--yes`만 사용하면 Storybook AI Review는 기본적으로 비활성화됩니다. 필요한 경우 `--yes --storybook-ai-review` 또는 `--yes --storybook-ai-review-demo`로 명시해서 사용할 수 있습니다.

## Private 저장소 인증

private 템플릿이나 `storybook_addon`을 사용할 때 해당 저장소에 접근 가능한 GitHub 인증이 필요합니다.

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
  -> 선택 시 Storybook AI Review 설정 + tools/ai-bridge 주입
  -> 선택 시 src/ai-review-demo Demo Story 주입
  -> .env.example이 있으면 .env.local 생성
  -> 선택한 package manager로 install
  -> 선택 시 git init
```

## 개발

Node.js 20 이상이 필요합니다.

```bash
npm test
node ./bin/create-hiy-front.js --help
node ./bin/create-hiy-front.js --list
```
