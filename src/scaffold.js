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
import { spawnSync } from 'node:child_process';

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
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
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
      'repo', 'clone', template.repository, cloneDir, '--',
      '--depth', '1', '--branch', template.ref,
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
    ['clone', '--depth', '1', '--branch', template.ref, `https://github.com/${template.repository}.git`, cloneDir],
    { env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } },
  );

  if (result.status === 0) return;
  failures.push(`git: ${(result.stderr || result.stdout || '').trim()}`);

  const detail = failures.filter(Boolean).join('\n').slice(-1600);
  throw new Error(
    `템플릿 ${template.repository}@${template.ref} 을(를) 가져오지 못했습니다. ` +
      'private 저장소이면 `gh auth login` 또는 Git credential 설정이 필요하고, 선택한 버전 tag가 실제로 존재해야 합니다.' +
      (detail ? `\n\n${detail}` : ''),
  );
}

function assertTargetDirectory(targetDir) {
  if (!existsSync(targetDir)) return;
  if (!statSync(targetDir).isDirectory()) throw new Error(`대상 경로가 디렉터리가 아닙니다: ${targetDir}`);
  if (readdirSync(targetDir).length > 0) throw new Error(`대상 디렉터리가 비어 있지 않습니다: ${targetDir}`);
}

function packageNameFromPath(targetDir) {
  const raw = path.basename(targetDir).toLowerCase();
  return raw
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/^[._-]+/, '')
    .replace(/-+/g, '-') || 'hiy-app';
}

function writeStarterMetadata(targetDir, template) {
  const metadata = {
    schemaVersion: 1,
    starter: 'create-hiy-starter',
    template: {
      id: template.id,
      kind: template.kind,
      name: template.name,
      version: template.version,
      repository: template.repository,
      ref: template.ref,
      channel: template.channel,
    },
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(path.join(targetDir, '.hiy-starter.json'), `${JSON.stringify(metadata, null, 2)}\n`);
}

function normalizeGeneratedProject(targetDir, template) {
  const packageJsonPath = path.join(targetDir, 'package.json');
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    packageJson.name = packageNameFromPath(targetDir);
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  }

  for (const lockFile of LOCK_FILES) removeIfExists(path.join(targetDir, lockFile));

  const envExample = path.join(targetDir, '.env.example');
  const envLocal = path.join(targetDir, '.env.local');
  if (existsSync(envExample) && !existsSync(envLocal)) copyFileSync(envExample, envLocal);

  writeStarterMetadata(targetDir, template);
}

function initializeGit(targetDir, warnings) {
  if (!commandExists('git')) {
    warnings.push('Git을 찾을 수 없어 새 저장소 초기화를 건너뛰었습니다.');
    return;
  }

  let result = spawnSync('git', ['init', '-b', 'main'], { cwd: targetDir, stdio: 'ignore' });
  if (result.status !== 0) result = spawnSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });
  if (result.status !== 0) warnings.push('git init 실행에 실패했습니다.');
}

function installDependencies(targetDir, packageManager, warnings) {
  const [command, args] = INSTALL_COMMANDS[packageManager];
  if (!commandExists(command)) {
    warnings.push(`${command} 명령을 찾을 수 없어 의존성 설치를 건너뛰었습니다.`);
    return;
  }

  const result = spawnSync(command, args, { cwd: targetDir, stdio: 'inherit' });
  if (result.status !== 0) warnings.push(`${command} 의존성 설치가 실패했습니다. 프로젝트 생성 자체는 완료되었습니다.`);
}

export function createProject({ cwd = process.cwd(), projectName, template, packageManager, install = true, git = true }) {
  const targetDir = path.resolve(cwd, projectName);
  assertTargetDirectory(targetDir);

  const tempRoot = mkdtempSync(path.join(tmpdir(), 'create-hiy-starter-'));
  const cloneDir = path.join(tempRoot, 'template');
  const warnings = [];

  try {
    cloneTemplate(template, cloneDir);
    mkdirSync(targetDir, { recursive: true });
    cpSync(cloneDir, targetDir, {
      recursive: true,
      filter(source) { return path.basename(source) !== '.git'; },
    });

    normalizeGeneratedProject(targetDir, template);
    if (install) installDependencies(targetDir, packageManager, warnings);
    if (git) initializeGit(targetDir, warnings);
    return { targetDir, warnings };
  } finally {
    removeIfExists(tempRoot);
  }
}
