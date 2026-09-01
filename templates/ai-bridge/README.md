# ai-bridge

Storybook AI review payload에 로컬 저장소 문맥을 더하고, CLI 코딩 에이전트가 지정된 소스 파일을 수정하도록 실행하는 최소 의존성 HTTP 서버다. `--storybook-ai-review`로 생성한 프로젝트에는 이 디렉토리가 `tools/ai-bridge`에 함께 포함되어 있다. Node.js 표준 라이브러리만 사용하며 기본 동작은 **dry-run**이다.

## 시작하기

프로젝트 루트에서 바로 실행한다. 별도 설치는 필요 없다.

```bash
npm run ai-bridge
```

기본 주소는 `http://127.0.0.1:4700`이다. `GET /health`로 모드와 명령 설정 여부를 확인할 수 있다.

`projectRoot`를 요청에 포함하지 않으면, 이 서버가 위치한 프로젝트(`tools/ai-bridge`의 두 단계 상위 디렉토리)가 기본값으로 쓰인다 — 즉 이 프로젝트를 대상으로 테스트할 때는 `projectRoot`를 생략해도 된다.

## 환경 변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `AI_EDIT_COMMAND` | 미설정 | 실행 파일과 인자 템플릿. `{cwd}`와 `{prompt}` placeholder를 지원한다. |
| `AI_BRIDGE_EXECUTE` | 미설정 | 정확히 `1`일 때만 CLI를 실제 실행한다. 그 외에는 항상 dry-run이다. |
| `AI_BRIDGE_HOST` | `127.0.0.1` | 서버가 바인딩할 호스트다. |
| `AI_BRIDGE_PORT` | `4700` | 서버 포트다. |

`AI_EDIT_COMMAND`는 다음 두 형식 중 하나로 설정한다.

```bash
# 공백과 따옴표를 인식하는 간단한 command 형식
AI_EDIT_COMMAND='codex exec --cd {cwd} {prompt}' npm run ai-bridge

# 인자를 정확하게 구분할 수 있는 JSON 배열 형식
AI_EDIT_COMMAND='["codex","exec","--cd","{cwd}","{prompt}"]' npm run ai-bridge
```

명령은 셸을 거치지 않고 직접 실행된다. 따라서 review 내용이 셸 명령으로 해석되지 않으며, `|`, `>`, `&&` 같은 셸 문법도 동작하지 않는다. 그런 조합이 꼭 필요하면 사용자가 검토한 wrapper 실행 파일을 명시한다.

- `{cwd}`는 프로젝트 루트로 치환된다. placeholder가 없어도 프로세스의 working directory는 항상 프로젝트 루트다.
- `{prompt}`가 있으면 생성한 프롬프트를 하나의 CLI 인자로 전달한다.
- `{prompt}`가 없으면 프롬프트를 stdin으로 전달한다. 예: `AI_EDIT_COMMAND='claude -p'`.

dry-run에서는 `AI_EDIT_COMMAND`가 없어도 202 응답을 반환하며, 명령이 설정되지 않았음을 실행 계획과 서버 로그에 남긴다. 명령을 설정하면 실제로 실행될 executable, args, cwd와 프롬프트 전달 방식을 미리 볼 수 있다.

## 요청 테스트

먼저 [`test-payload.json`](./test-payload.json)의 `targetFile`을 실제 프로젝트에 존재하는 소스 파일 경로로 바꾼다(`projectRoot`는 생략하면 이 프로젝트 자신이 기본값이 된다).

```bash
curl -s -o /tmp/ai-bridge-response.json -w '%{http_code}\n' \
  -X POST http://127.0.0.1:4700/review \
  -H 'Content-Type: application/json' \
  -d @tools/ai-bridge/test-payload.json

jq . /tmp/ai-bridge-response.json
```

기본 모드에서는 HTTP 202와 다음 정보가 JSON으로 반환된다.

- 모든 comment와 selector/tagName/text/attributes/rect/targetFile을 합친 `prompt`
- `cwd`, executable, args, prompt 전달 방식을 담은 `execution`
- `mode: "dry-run"`, `status: "accepted"`

## 실제 CLI 실행

실제 실행 전에 `targetFile`이 프로젝트 안에 실존하는 파일을 가리키는지 확인한다. 실행 모드에서는 프로젝트 디렉토리와 대상 파일이 존재해야 하며, 심볼릭 링크까지 해석한 대상 파일이 프로젝트 루트 내부에 있어야 한다.

Codex 예시:

```bash
AI_BRIDGE_EXECUTE=1 \
AI_EDIT_COMMAND='codex exec --cd {cwd} {prompt}' \
npm run ai-bridge
```

Claude Code에서 프롬프트를 stdin으로 보내는 예시:

```bash
AI_BRIDGE_EXECUTE=1 \
AI_EDIT_COMMAND='claude -p' \
npm run ai-bridge
```

서브프로세스가 끝나면 stdout, stderr, exit code, signal, 실행 시간이 응답 JSON과 서버의 구조화된 JSON 로그에 함께 기록된다. 정상 종료는 200, spawn 실패나 0이 아닌 exit code는 502를 반환한다.

서버는 권한 우회 옵션을 자동으로 추가하지 않는다. 실행되는 에이전트는 현재 사용자 권한을 그대로 가지므로, 실제 프로젝트에서는 요청 전후 diff를 반드시 검토한다.

## Storybook addon과 연동

`storybook_addon`(`@hiy/storybook-addon-ai-review`)의 "Send to AI"는 현재 `storyId`/`comments`/`instruction`만 전송하고 `targetFile`은 보내지 않는다(DOM→소스 자동 매핑은 addon의 다음 단계 항목). 그래서 지금은 아래 순서로 테스트한다.

1. `.env.local`에 `VITE_HIY_AI_REVIEW_ENDPOINT=http://127.0.0.1:4700/review`를 설정한다.
2. Storybook의 AI Review 패널에서 `Copy AI context`로 payload를 복사한다.
3. 복사한 JSON에 `targetFile`(과 필요하면 `projectRoot`)을 추가해 `curl`로 위 엔드포인트에 보낸다.

## API 요약

### `POST /review`

필수 필드:

- `storyId`: Storybook story ID
- `targetFile`: 프로젝트 내부 기존 소스 파일의 상대경로
- `comments`: 하나 이상의 review comment

선택 필드:

- `projectRoot`: 대상 프로젝트 절대경로. 생략하면 이 서버가 위치한 프로젝트가 기본값이다.

요청 본문은 `application/json`이어야 하며 최대 크기는 1 MiB다. CLI stdout과 stderr는 각각 최대 2 MiB까지 응답과 로그에 보관하고, 초과분은 잘렸다고 표시한다.

### `GET /health`

서버 상태, dry-run/execute 모드, `AI_EDIT_COMMAND` 설정 여부, 기본 `projectRoot`를 반환한다.
