import { parseArgs, resolveTemplateFromArgs } from './args.js';
import { createPrompter } from './prompts.js';
import { createProject } from './scaffold.js';
import { getTemplateByMap, listTemplates, resolveTemplateVersion } from './templates.js';

const VERSION = '0.3.0';
const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'];

function printHelp() {
  console.log(`create-hiy-starter ${VERSION}\n\nUsage:\n  create-hiy-starter [project-name] [options]\n\nOptions:\n  --template <id[@version]>          사용할 템플릿과 버전 선택\n  --template-version <version>       템플릿 버전 선택\n  --map <none|openlayers>            프론트엔드 지도 설정\n  --package-manager <name>           npm | pnpm | yarn | bun\n  --skip-install                     의존성 설치 생략\n  --git                              Git 저장소 초기화\n  --no-git                           Git 저장소 초기화 생략\n  -y, --yes                          질문 없이 기본값 사용\n  --list                             등록된 템플릿/버전 목록 출력\n  -v, --version                      CLI 버전 출력\n  -h, --help                         도움말 출력\n\nExamples:\n  create-hiy-starter\n  create-hiy-starter my-app --template react\n  create-hiy-starter my-app --template react@0.1.0\n  create-hiy-starter gis-app --map openlayers --package-manager pnpm\n`);
}

function printTemplates() {
  console.log('등록된 HIY Starter 템플릿:\n');
  for (const template of listTemplates()) {
    const versions = template.versions.map((item) => item.version).join(', ');
    console.log(`- ${template.id.padEnd(10)} kind=${template.kind.padEnd(8)} stable=${template.stable}`);
    console.log(`  ${template.repository}`);
    console.log(`  versions: ${versions}`);
    console.log(`  ${template.description}`);
  }
}

function mapChoices() {
  return listTemplates()
    .filter((template) => template.kind === 'frontend')
    .map((template) => ({
      label: template.map === 'none' ? '지도 사용 안 함' : 'OpenLayers',
      description: template.description,
      value: template.map,
    }));
}

function packageManagerChoices() {
  return PACKAGE_MANAGERS.map((name) => ({ label: name, value: name }));
}

export async function runCli(argv) {
  const args = parseArgs(argv);

  if (args.help) { printHelp(); return; }
  if (args.version) { console.log(VERSION); return; }
  if (args.list) { printTemplates(); return; }

  let template = resolveTemplateFromArgs(args);
  const prompter = createPrompter();

  try {
    const projectName = args.projectName ?? (args.yes ? 'hiy-app' : await prompter.text('프로젝트 이름', 'hiy-app'));

    if (!template) {
      const map = args.yes
        ? 'none'
        : await prompter.select('지도 기능을 사용하시겠습니까?', mapChoices(), 0);
      template = resolveTemplateVersion(getTemplateByMap(map), args.templateVersion);
    }

    const packageManager = args.packageManager ?? (args.yes
      ? 'npm'
      : await prompter.select('Package manager를 선택해주세요.', packageManagerChoices(), 0));

    const install = args.skipInstall
      ? false
      : args.yes
        ? true
        : await prompter.confirm('의존성을 지금 설치할까요?', true);

    const git = args.git ?? (args.yes ? true : await prompter.confirm('새 Git 저장소로 초기화할까요?', true));

    console.log('\nHIY Starter 프로젝트를 생성합니다.');
    console.log(`  Project:  ${projectName}`);
    console.log(`  Template: ${template.name} (${template.repository})`);
    console.log(`  Version:  ${template.version} (${template.channel})`);
    console.log(`  Ref:      ${template.ref}`);
    console.log(`  Package:  ${packageManager}`);
    console.log(`  Install:  ${install ? 'yes' : 'no'}`);
    console.log(`  Git:      ${git ? 'yes' : 'no'}\n`);

    const result = createProject({ projectName, template, packageManager, install, git });

    console.log(`\n✓ 프로젝트 생성 완료: ${result.targetDir}`);
    if (result.warnings.length > 0) {
      console.log('\n주의:');
      for (const warning of result.warnings) console.log(`- ${warning}`);
    }

    console.log('\nNext steps:');
    console.log(`  cd ${projectName}`);
    if (!install) console.log(`  ${packageManager} install`);
    console.log(`  ${packageManager} run dev`);
  } finally {
    prompter.close();
  }
}
