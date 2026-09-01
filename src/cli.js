import { parseArgs, resolveTemplateFromArgs } from './args.js';
import { createPrompter } from './prompts.js';
import { createProject } from './scaffold.js';
import { getTemplateByMap, listTemplates } from './templates.js';

const VERSION = '0.2.0';
const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'];

function printHelp() {
  console.log(`create-hiy-front ${VERSION}\n\nUsage:\n  create-hiy-front [project-name] [options]\n\nOptions:\n  --template <react|react-ol>       사용할 템플릿을 직접 선택\n  --map <none|openlayers>           지도 사용 여부로 템플릿 선택\n  --package-manager <name>          npm | pnpm | yarn | bun\n  --storybook-ai-review             Storybook AI Review addon 포함\n  --storybook-ai-review-demo        AI Review addon + 확인용 샘플 Story 포함\n  --no-storybook-ai-review          Storybook AI Review addon 제외\n  --no-storybook-ai-review-demo     AI Review 샘플 Story 제외\n  --skip-install                    의존성 설치 생략\n  --git                             Git 저장소 초기화\n  --no-git                          Git 저장소 초기화 생략\n  -y, --yes                         질문 없이 기본값 사용\n  --list                            등록된 템플릿 목록 출력\n  -v, --version                     버전 출력\n  -h, --help                        도움말 출력\n\nExamples:\n  create-hiy-front\n  create-hiy-front my-app --map none\n  create-hiy-front gis-app --map openlayers --package-manager pnpm\n  create-hiy-front my-app --storybook-ai-review-demo\n`);
}

function printTemplates() {
  console.log('등록된 HIY Front 템플릿:\n');
  for (const template of listTemplates()) {
    console.log(`- ${template.id.padEnd(10)} map=${template.map.padEnd(10)} ${template.repository}`);
    console.log(`  ${template.description}`);
  }
}

function mapChoices() {
  return listTemplates().map((template) => ({
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
    const projectName = args.projectName ?? (args.yes ? 'hiy-front-app' : await prompter.text('프로젝트 이름', 'hiy-front-app'));
    if (!template) {
      const map = args.yes ? 'none' : await prompter.select('지도 기능을 사용하시겠습니까?', mapChoices(), 0);
      template = getTemplateByMap(map);
    }
    const packageManager = args.packageManager ?? (args.yes ? 'npm' : await prompter.select('Package manager를 선택해주세요.', packageManagerChoices(), 0));
    const storybookAiReview = args.storybookAiReview ?? (args.yes ? false : await prompter.confirm('Storybook AI Review addon을 추가할까요?', false));
    const storybookAiReviewDemo = storybookAiReview
      ? (args.storybookAiReviewDemo ?? (args.yes ? false : await prompter.confirm('AI Review 확인용 샘플 Story도 추가할까요?', false)))
      : false;
    const install = args.skipInstall ? false : args.yes ? true : await prompter.confirm('의존성을 지금 설치할까요?', true);
    const git = args.git ?? (args.yes ? true : await prompter.confirm('새 Git 저장소로 초기화할까요?', true));

    console.log('\nHIY Front 프로젝트를 생성합니다.');
    console.log(`  Project:  ${projectName}`);
    console.log(`  Template: ${template.name} (${template.repository})`);
    console.log(`  Map:      ${template.map}`);
    console.log(`  Package:  ${packageManager}`);
    console.log(`  AI Review:${storybookAiReview ? ' yes' : ' no'}`);
    console.log(`  AI Demo:  ${storybookAiReviewDemo ? 'yes' : 'no'}`);
    console.log(`  Install:  ${install ? 'yes' : 'no'}`);
    console.log(`  Git:      ${git ? 'yes' : 'no'}\n`);

    const result = createProject({ projectName, template, packageManager, storybookAiReview, storybookAiReviewDemo, install, git });

    console.log(`\n✓ 프로젝트 생성 완료: ${result.targetDir}`);
    if (result.warnings.length > 0) {
      console.log('\n주의:');
      for (const warning of result.warnings) console.log(`- ${warning}`);
    }

    console.log('\nNext steps:');
    console.log(`  cd ${projectName}`);
    if (!install) console.log(`  ${packageManager} install`);
    console.log(`  ${packageManager} run dev`);
    if (storybookAiReview) console.log(`  ${packageManager} run storybook`);
  } finally {
    prompter.close();
  }
}
