import { getTemplateById, getTemplateByMap } from './templates.js';

const PACKAGE_MANAGERS = new Set(['npm', 'pnpm', 'yarn', 'bun']);

export function parseArgs(argv) {
  const result = {
    projectName: null,
    template: null,
    map: null,
    packageManager: null,
    skipInstall: false,
    git: null,
    storybookAiReview: null,
    yes: false,
    help: false,
    version: false,
    list: false,
  };

  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '-h' || arg === '--help') {
      result.help = true;
      continue;
    }
    if (arg === '-v' || arg === '--version') {
      result.version = true;
      continue;
    }
    if (arg === '--list') {
      result.list = true;
      continue;
    }
    if (arg === '-y' || arg === '--yes') {
      result.yes = true;
      continue;
    }
    if (arg === '--skip-install') {
      result.skipInstall = true;
      continue;
    }
    if (arg === '--no-git') {
      result.git = false;
      continue;
    }
    if (arg === '--git') {
      result.git = true;
      continue;
    }
    if (arg === '--storybook-ai-review') {
      result.storybookAiReview = true;
      continue;
    }
    if (arg === '--no-storybook-ai-review') {
      result.storybookAiReview = false;
      continue;
    }

    const [key, inlineValue] = arg.startsWith('--') && arg.includes('=')
      ? arg.split(/=(.*)/s, 2)
      : [arg, null];

    if (['--template', '--map', '--package-manager'].includes(key)) {
      const value = inlineValue ?? argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${key} 옵션에 값이 필요합니다.`);
      }
      if (inlineValue === null) {
        index += 1;
      }

      if (key === '--template') result.template = value;
      if (key === '--map') result.map = value;
      if (key === '--package-manager') result.packageManager = value;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`알 수 없는 옵션입니다: ${arg}`);
    }

    positional.push(arg);
  }

  if (positional.length > 1) {
    throw new Error('프로젝트 경로는 하나만 지정할 수 있습니다.');
  }

  result.projectName = positional[0] ?? null;

  if (result.packageManager && !PACKAGE_MANAGERS.has(result.packageManager)) {
    throw new Error(`지원하지 않는 package manager입니다: ${result.packageManager}`);
  }

  return result;
}

export function resolveTemplateFromArgs(args) {
  const byId = args.template ? getTemplateById(args.template) : null;
  if (args.template && !byId) {
    throw new Error(`존재하지 않는 템플릿입니다: ${args.template}`);
  }

  const byMap = args.map ? getTemplateByMap(args.map) : null;
  if (args.map && !byMap) {
    throw new Error(`지원하지 않는 지도 설정입니다: ${args.map}`);
  }

  if (byId && byMap && byId.id !== byMap.id) {
    throw new Error(`--template ${byId.id} 와 --map ${byMap.map} 설정이 서로 충돌합니다.`);
  }

  return byId ?? byMap ?? null;
}
