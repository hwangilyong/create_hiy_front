import { DemoActionButton } from './DemoActionButton';
import { DemoAvatar } from './DemoAvatar';
import { DemoUserInfo } from './DemoUserInfo';

export function DemoProfileCard() {
  return (
    <section
      style={{
        width: 520,
        maxWidth: '100%',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 18,
        alignItems: 'center',
        padding: 24,
        border: '1px solid rgba(128,128,128,.28)',
        borderRadius: 16,
        boxShadow: '0 10px 28px rgba(0,0,0,.08)',
      }}
    >
      <DemoAvatar />
      <DemoUserInfo />
      <DemoActionButton />
    </section>
  );
}
