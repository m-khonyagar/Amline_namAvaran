import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './input'

const meta = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    error: { control: 'text' },
    hint: { control: 'text' },
    label: { control: 'text' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'شماره موبایل',
    placeholder: '09121234567',
    name: 'mobile',
    id: 'story-mobile',
  },
}

export const WithHint: Story = {
  args: {
    label: 'ایمیل',
    type: 'email',
    placeholder: 'you@example.com',
    hint: 'فقط برای اطلاع‌رسانی استفاده می‌شود.',
    id: 'story-email',
  },
}

export const WithError: Story = {
  args: {
    label: 'کد ملی',
    placeholder: '۱۰ رقم',
    error: 'کد ملی نامعتبر است.',
    id: 'story-national',
  },
}
