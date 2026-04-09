import type { Meta, StoryObj } from '@storybook/react'
import { Alert } from './alert'

const meta = {
  title: 'UI/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['error', 'warning', 'success', 'info'],
    },
  },
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Info: Story = {
  args: {
    variant: 'info',
    title: 'یادآوری',
    children: 'این یک پیام اطلاع‌رسانی است.',
  },
}

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'ذخیره شد',
    children: 'تغییرات با موفقیت ثبت شد.',
  },
}

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'توجه',
    children: 'قبل از ادامه، موارد را بررسی کنید.',
  },
}

export const Error: Story = {
  args: {
    variant: 'error',
    title: 'خطا',
    children: 'عملیات انجام نشد. دوباره تلاش کنید.',
  },
}
