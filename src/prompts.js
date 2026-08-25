import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export function createPrompter() {
  const rl = createInterface({ input, output });

  return {
    async text(label, defaultValue = '') {
      const suffix = defaultValue ? ` (${defaultValue})` : '';
      const answer = (await rl.question(`${label}${suffix}: `)).trim();
      return answer || defaultValue;
    },

    async select(label, choices, defaultIndex = 0) {
      output.write(`\n${label}\n`);
      choices.forEach((choice, index) => {
        output.write(`  ${index + 1}) ${choice.label}${choice.description ? ` - ${choice.description}` : ''}\n`);
      });

      while (true) {
        const answer = (await rl.question(`선택 [${defaultIndex + 1}]: `)).trim();
        const selectedIndex = answer === '' ? defaultIndex : Number(answer) - 1;
        if (Number.isInteger(selectedIndex) && choices[selectedIndex]) {
          return choices[selectedIndex].value;
        }
        output.write('올바른 번호를 입력해주세요.\n');
      }
    },

    async confirm(label, defaultValue = true) {
      const hint = defaultValue ? 'Y/n' : 'y/N';
      while (true) {
        const answer = (await rl.question(`${label} (${hint}): `)).trim().toLowerCase();
        if (!answer) return defaultValue;
        if (['y', 'yes'].includes(answer)) return true;
        if (['n', 'no'].includes(answer)) return false;
        output.write('y 또는 n으로 입력해주세요.\n');
      }
    },

    close() {
      rl.close();
    },
  };
}
