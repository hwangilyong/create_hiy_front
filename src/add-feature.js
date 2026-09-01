import {
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

const OPENLAYERS_TEMPLATE = {
  repository: 'hwangilyong/react_ol_init',
  ref: 'main',
};

const INSTALL_COMMANDS = {
  npm: ['npm', ['install']],
  pnpm: ['pnpm', ['install']],
  yarn: ['yarn', []],
  bun: ['bun', ['install']],
};

const OPENLAYERS_DEPENDENCIES = {
  ol: '^10.7.0',
  'ol-contextmenu': '5.5.0',
};

function commandExists(command) {
  return spawnSync(command, ['--version'], { stdio: 'ignore' }).status === 0;
}

function removeIfExists(target) {
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}

function cloneTemplate(cloneDir) {
  const failures = [];
  if (commandExists('gh')) {
    const result = spawnSync(
      'gh',
      ['repo', 'clone', OPENLAYERS_TEMPLATE.repository, cloneDir, '--', '--depth', '1', '--branch', OPENLAYERS_TEMPLATE.ref],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    if (result.status === 0) return;
    failures.push(`gh: ${(result.stderr || result.stdout || '').trim()}`);
    removeIfExists(cloneDir);
  }

  if (!commandExists('git')) throw new Error('OpenLayers 모듈을 가져오려면 git 또는 gh 명령이 필요합니다.');
  const result = spawnSync(
    'git',
    ['clone', '--depth', '1', '--branch', OPENLAYERS_TEMPLATE.ref, `https://github.com/${OPENLAYERS_TEMPLATE.repository}.git`, cloneDir],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } },
  );
  if (result.status === 0) return;
  failures.push(`git: ${(result.stderr || result.stdout || '').trim()}`);
  throw new Error(`react_ol_init을 가져오지 못했습니다.\n${failures.filter(Boolean).join('\n').slice(-1600)}`);
}

function copyMissingRecursive(source, destination, result) {
  const sourceStat = statSync(source);
  if (sourceStat.isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const name of readdirSync(source)) {
      copyMissingRecursive(path.join(source, name), path.join(destination, name), result);
    }
    return;
  }

  if (existsSync(destination)) {
    result.skipped.push(path.relative(result.projectRoot, destination));
    return;
  }
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination);
  result.created.push(path.relative(result.projectRoot, destination));
}

function detectPackageManager(projectRoot, requested) {
  if (requested) return requested;
  const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  if (typeof packageJson.packageManager === 'string') {
    const name = packageJson.packageManager.split('@')[0];
    if (INSTALL_COMMANDS[name]) return name;
  }
  if (existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(path.join(projectRoot, 'yarn.lock'))) return 'yarn';
  if (existsSync(path.join(projectRoot, 'bun.lock')) || existsSync(path.join(projectRoot, 'bun.lockb'))) return 'bun';
  return 'npm';
}

function assertReactProject(projectRoot) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!existsSync(packageJsonPath)) throw new Error(`package.json을 찾을 수 없습니다: ${projectRoot}`);
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const allDeps = { ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}) };
  if (!allDeps.react) throw new Error('현재 디렉터리는 React 프로젝트로 확인되지 않습니다. package.json에 react 의존성이 필요합니다.');
  return { packageJsonPath, packageJson };
}

function addDependencies(packageJsonPath, packageJson) {
  packageJson.dependencies = { ...(packageJson.dependencies ?? {}) };
  const added = [];
  for (const [name, version] of Object.entries(OPENLAYERS_DEPENDENCIES)) {
    if (!packageJson.dependencies[name] && !packageJson.devDependencies?.[name]) {
      packageJson.dependencies[name] = version;
      added.push(name);
    }
  }
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  return added;
}

function installDependencies(projectRoot, packageManager) {
  const [command, args] = INSTALL_COMMANDS[packageManager] ?? [];
  if (!command) throw new Error(`지원하지 않는 package manager입니다: ${packageManager}`);
  if (!commandExists(command)) return { installed: false, warning: `${command} 명령을 찾을 수 있어 package.json만 갱신했습니다.` };
  const result = spawnSync(command, args, { cwd: projectRoot, stdio: 'inherit' });
  if (result.status !== 0) return { installed: false, warning: `${command} 의존성 설치에 실패했습니다. package.json 변경과 OL 소스 추가는 유지됩니다.` };
  return { installed: true, warning: null };
}

export function parseAddCommand(argv) {
  if (argv[0] !== 'add') return null;
  const feature = argv[1] ?? null;
  let packageManager = null;
  let skipInstall = false;
  let withExample = false;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--skip-install') { skipInstall = true; continue; }
    if (arg === '--with-example') { withExample = true; continue; }
    const [key, inlineValue] = arg.startsWith('--') && arg.includes('=') ? arg.split(/=(.*)/s, 2) : [arg, null];
    if (key === '--package-manager') {
      const value = inlineValue ?? argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--package-manager 옵션에 값이 필요합니다.');
      packageManager = value;
      if (inlineValue === null) index += 1;
      continue;
    }
    throw new Error(`알 수 없는 add 옵션입니다: ${arg}`);
  }

  if (!feature) throw new Error('추가할 기능이 필요합니다. 예: create-hiy-front add openlayers');
  if (feature !== 'openlayers') throw new Error(`지원하지 않는 추가 기능입니다: ${feature}`);
  if (packageManager && !INSTALL_COMMANDS[packageManager]) throw new Error(`지원하지 않는 package manager입니다: ${packageManager}`);
  return { feature, packageManager, skipInstall, withExample };
}

export function addOpenLayers({ cwd = process.cwd(), packageManager = null, install = true, withExample = false } = {}) {
  const projectRoot = path.resolve(cwd);
  const { packageJsonPath, packageJson } = assertReactProject(projectRoot);
  const selectedPackageManager = detectPackageManager(projectRoot, packageManager);
  const result = { projectRoot, created: [], skipped: [], dependenciesAdded: [], packageManager: selectedPackageManager, installed: false, warnings: [] };
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'create-hiy-front-ol-'));
  const cloneDir = path.join(tempRoot, 'react-ol-init');

  try {
    cloneTemplate(cloneDir);
    result.dependenciesAdded = addDependencies(packageJsonPath, packageJson);

    copyMissingRecursive(
      path.join(cloneDir, 'src', 'shared', 'lib', 'ol'),
      path.join(projectRoot, 'src', 'shared', 'lib', 'ol'),
      result,
    );

    const docs = ['OL-RUNTIME-CONCEPTS.md', 'SELECTION.md', 'OPTIONAL-MAP-UI.md', 'USAGE.md'];
    for (const name of docs) {
      const source = path.join(cloneDir, 'docs', name);
      if (existsSync(source)) copyMissingRecursive(source, path.join(projectRoot, 'docs', 'openlayers', name), result);
    }

    if (withExample) {
      copyMissingRecursive(
        path.join(cloneDir, 'src', 'widgets', 'map-workbench'),
        path.join(projectRoot, 'src', 'widgets', 'map-workbench'),
        result,
      );
      const packageJsonAfter = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      packageJsonAfter.devDependencies = { ...(packageJsonAfter.devDependencies ?? {}) };
      if (!packageJsonAfter.devDependencies.sass && !packageJsonAfter.dependencies?.sass) {
        packageJsonAfter.devDependencies.sass = '^1.97.2';
        result.dependenciesAdded.push('sass');
      }
      writeFileSync(packageJsonPath, `${JSON.stringify(packageJsonAfter, null, 2)}\n`);
    }

    if (install) {
      const installResult = installDependencies(projectRoot, selectedPackageManager);
      result.installed = installResult.installed;
      if (installResult.warning) result.warnings.push(installResult.warning);
    }
    return result;
  } finally {
    removeIfExists(tempRoot);
  }
}
