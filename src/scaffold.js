import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const AI_BRIDGE_TEMPLATE_DIR = path.join(MODULE_DIR, '..', 'templates', 'ai-bridge');

const LOCK_FILES = [
  'package-lock.json',
  'npm-shrinkwrap.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
];

const INSTALL_COMMANDS = {
  npm: ['npm', ['install']],
  pnpm: ['pnpm', ['install']],
  yarn: ['yarn', []],
  bun: ['bun', ['install']],
};

function commandExists(command) {
  const result = spawnSync(command, ['--version'], { stdio: 'ignore' });
  return result.status === 0;
}

function removeIfExists(target) {
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
}

function cloneWith(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function cloneTemplate(template, cloneDir) {
  const failures = [];

  if (commandExists('gh')) {
    const result = cloneWith('gh', [
      'repo',
      'clone',
      template.repository,
      cloneDir,
      '--',
      '--depth',
      '1',
      '--branch',
      template.ref,
    ]);

    if (result.status === 0) return;
    failures.push(`gh: ${(result.stderr || result.stdout || '').trim()}`);
    removeIfExists(cloneDir);
  }

  if (!commandExists('git')) {
    throw new Error('git 명령을 찾을 수 없습니다. Git을 설치한 뒤 다시 실행해주세요.');
  }

  const result = cloneWith(
    'git',
    [
      'clone',
      '--depth',
      '1',
      '--branch',
      template.ref,
      `https://github.com/${template.repository}.git`,
      cloneDir,
    ],
    {
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
      },
    },
  );

  if (result.status === 0) return;
  failures.push(`git: ${(result.stderr || result.stdout || '').trim()}`);

  const detail = failures.filter(Boolean).join('\n').slice(-1600);
  throw new Error(
    `템플릿 ${template.repository} 을(를) 가져오지 못했습니다. ` +
      '현재 템플릿 저장소가 private이면 `gh auth login` 또는 Git credential 설정이 필요합니다.' +
      (detail ? `\n\n${detail}` : ''),
  );
}

function assertTargetDirectory(targetDir) {
  if (!existsSync(targetDir)) return;
  if (!statSync(targetDir).isDirectory()) {
    throw new Error(`대상 경로가 디렉터리가 아닙니다: ${targetDir}`);
  }
  if (readdirSync(targetDir).length > 0) {
    throw new Error(`대상 디렉터리가 비어 있지 않습니다: ${targetDir}`);
  }
}

function packageNameFromPath(targetDir) {
  const raw = path.basename(targetDir).toLowerCase();
  return (
    raw
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/^[._-]+/, '')
      .replace(/-+/g, '-') || 'hiy-front-app'
  );
}

function normalizeGeneratedProject(targetDir) {
  const packageJsonPath = path.join(targetDir, 'package.json');
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    packageJson.name = packageNameFromPath(targetDir);
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  }

  for (const lockFile of LOCK_FILES) {
    removeIfExists(path.join(targetDir, lockFile));
  }
}

function syncEnvLocal(targetDir) {
  const envExample = path.join(targetDir, '.env.example');
  const envLocal = path.join(targetDir, '.env.local');
  if (existsSync(envExample) && !existsSync(envLocal)) {
    copyFileSync(envExample, envLocal);
  }
}

function configureStorybookAiReview(targetDir) {
  const packageJsonPath = path.join(targetDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error('Storybook AI Review를 구성하려면 package.json이 필요합니다.');
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  packageJson.scripts = {
    ...(packageJson.scripts ?? {}),
    storybook: 'storybook dev -p 6006',
    'build-storybook': 'storybook build',
    'ai-bridge': 'node tools/ai-bridge/server.mjs',
  };
  packageJson.devDependencies = {
    ...(packageJson.devDependencies ?? {}),
    '@hiy/storybook-addon-ai-review': 'github:hwangilyong/storybook_addon#main',
    '@storybook/react-vite': 'latest',
    'better-sqlite3': '^12.2.0',
    storybook: 'latest',
  };
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  const storybookDir = path.join(targetDir, '.storybook');
  mkdirSync(storybookDir, { recursive: true });

  writeFileSync(
    path.join(storybookDir, 'main.ts'),
    `import type { StorybookConfig } from '@storybook/react-vite';\n\nconst config: StorybookConfig = {\n  framework: '@storybook/react-vite',\n  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],\n  addons: ['@hiy/storybook-addon-ai-review/preset'],\n};\n\nexport default config;\n`,
  );

  writeFileSync(
    path.join(storybookDir, 'preview.ts'),
    `import type { Preview } from '@storybook/react-vite';\n\nconst preview: Preview = {\n  parameters: {\n    hiyAiReview: {\n      endpoint: import.meta.env.VITE_HIY_AI_REVIEW_ENDPOINT ?? '',\n    },\n  },\n};\n\nexport default preview;\n`,
  );

  const envExamplePath = path.join(targetDir, '.env.example');
  const existingEnv = existsSync(envExamplePath) ? readFileSync(envExamplePath, 'utf8') : '';
  if (!existingEnv.includes('VITE_HIY_AI_REVIEW_ENDPOINT=')) {
    const prefix = existingEnv && !existingEnv.endsWith('\n') ? '\n' : '';
    writeFileSync(
      envExamplePath,
      `${existingEnv}${prefix}VITE_HIY_AI_REVIEW_ENDPOINT=http://127.0.0.1:4700/review\n`,
    );
  }

  const gitignorePath = path.join(targetDir, '.gitignore');
  const existingGitignore = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf8') : '';
  if (!existingGitignore.split(/\r?\n/).includes('.hiy-ai-review/')) {
    const prefix = existingGitignore && !existingGitignore.endsWith('\n') ? '\n' : '';
    writeFileSync(gitignorePath, `${existingGitignore}${prefix}.hiy-ai-review/\n`);
  }

  injectAiBridge(targetDir);
}

function injectAiBridge(targetDir) {
  if (!existsSync(AI_BRIDGE_TEMPLATE_DIR)) {
    throw new Error(`ai-bridge 템플릿을 찾을 수 없습니다: ${AI_BRIDGE_TEMPLATE_DIR}`);
  }

  const aiBridgeDir = path.join(targetDir, 'tools', 'ai-bridge');
  mkdirSync(aiBridgeDir, { recursive: true });
  cpSync(AI_BRIDGE_TEMPLATE_DIR, aiBridgeDir, { recursive: true });
}

function initializeGit(targetDir, warnings) {
  if (!commandExists('git')) {
    warnings.push('Git을 찾을 수 없어 새 저장소 초기화를 건너뛰었습니다.');
    return;
  }

  let result = spawnSync('git', ['init', '-b', 'main'], { cwd: targetDir, stdio: 'ignore' });
  if (result.status !== 0) {
    result = spawnSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });
  }
  if (result.status !== 0) {
    warnings.push('git init 실행에 실패했습니다.');
  }
}

function installDependencies(targetDir, packageManager, warnings) {
  const [command, args] = INSTALL_COMMANDS[packageManager];
  if (!commandExists(command)) {
    warnings.push(`${command} 명령을 찾을 수 없어 의존성 설치를 건너뛰었습니다.`);
    return;
  }

  const result = spawnSync(command, args, { cwd: targetDir, stdio: 'inherit' });
  if (result.status !== 0) {
    warnings.push(`${command} 의존성 설치가 실패했습니다. 프로젝트 생성 자체는 완료되었습니다.`);
  }
}

export function createProject({
  cwd = process.cwd(),
  projectName,
  template,
  packageManager,
  storybookAiReview = false,
  install = true,
  git = true,
}) {
  const targetDir = path.resolve(cwd, projectName);
  assertTargetDirectory(targetDir);

  const tempRoot = mkdtempSync(path.join(tmpdir(), 'create-hiy-front-'));
  const cloneDir = path.join(tempRoot, 'template');
  const warnings = [];

  try {
    cloneTemplate(template, cloneDir);
    mkdirSync(targetDir, { recursive: true });
    cpSync(cloneDir, targetDir, {
      recursive: true,
      filter(source) {
        return path.basename(source) !== '.git';
      },
    });

    normalizeGeneratedProject(targetDir);
    if (storybookAiReview) {
      configureStorybookAiReview(targetDir);
    }
    syncEnvLocal(targetDir);

    if (install) {
      installDependencies(targetDir, packageManager, warnings);
    }
    if (git) {
      initializeGit(targetDir, warnings);
    }

    return { targetDir, warnings };
  } finally {
    removeIfExists(tempRoot);
  }
}
