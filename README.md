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
- `storybook`, `build-storybook`, `ai-bridge` scripts
- `.storybook/main.ts`
- `.storybook/preview.ts`
- `.env.example`/`.env.local`의 `VITE_HIY_AI_REVIEW_ENDPOINT` (기본값 `http://127.0.0.1:4700/review`)
- `tools/ai-bridge/` — review payload를 받아 CLI 코딩 에이전트를 실행하는 로컬 브리지 서버 (자세한 내용은 생성된 프로젝트의 `tools/ai-bridge/README.md` 참고)

실행:

```bash
npm run storybook      # http://localhost:6006
npm run ai-bridge       # http://127.0.0.1:4700, 기본은 dry-run
```

Storybook toolbar의 `AI Review`를 켠 뒤 Canvas의 요소를 클릭하면 selector, text, attributes, bounding box가 수집되고 panel에서 코멘트를 달 수 있습니다. 코멘트는 AI context JSON으로 복사하거나 `VITE_HIY_AI_REVIEW_ENDPOINT`에 지정한 `ai-bridge`로 전송할 수 있습니다. `ai-bridge`가 실제로 파일을 수정하게 하려면 `AI_BRIDGE_EXECUTE=1`과 `AI_EDIT_COMMAND`를 설정해야 합니다 — 자세한 내용과 안전장치는 `tools/ai-bridge/README.md`에 있습니다.

현재 addon 저장소가 private이므로 생성 프로젝트에서 의존성을 설치할 때 해당 저장소에 접근 가능한 GitHub 인증이 필요합니다.

## 명령형 사용

```bash
# 일반 React
npx github:hwangilyong/create_hiy_front my-app --map none

# React + OpenLayers
npx github:hwangilyong/create_hiy_front gis-app --map openlayers

# Storybook AI Review 포함
npx github:hwangilyong/create_hiy_front my-app --storybook-ai-review

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
--no-storybook-ai-review          Storybook AI Review addon 제외
--skip-install                    의존성 설치 생략
--git                             Git 저장소 초기화
--no-git                          Git 저장소 초기화 생략
-y, --yes                         질문 없이 기본값 사용
--list                            등록된 템플릿 목록 출력
-v, --version                     버전 출력
-h, --help                        도움말 출력
```

`--yes`만 사용하면 Storybook AI Review는 기본적으로 비활성화됩니다. 필요한 경우 `--yes --storybook-ai-review`로 명시해서 사용할 수 있습니다.

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
  -> .env.example이 있으면 .env.local 생성 (주입된 내용까지 반영)
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
