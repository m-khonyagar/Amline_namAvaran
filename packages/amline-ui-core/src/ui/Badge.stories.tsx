import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './badge'

const meta = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: ['default', 'success', 'warning', 'error', 'info'],
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'پیش‌فرض',
    tone: 'default',
  },
}

export const Success: Story = {
  args: {
    children: 'تأیید شده',
    tone: 'success',
  },
}

export const Warning: Story = {
  args: {
    children: 'در انتظار',
    tone: 'warning',
  },
}

export const Error: Story = {
  args: {
    children: 'رد شده',
    tone: 'error',
  },
}

export const Info: Story = {
  args: {
    children: 'اطلاعات',
    tone: 'info',
  },
}
