import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoProfileCard } from './DemoProfileCard';

const meta = {
  title: 'AI Review Demo/Composite Profile Card',
  component: DemoProfileCard,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DemoProfileCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
