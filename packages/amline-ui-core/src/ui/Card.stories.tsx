import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>عنوان کارت</CardTitle>
        <CardDescription>توضیح کوتاه برای این بخش از رابط کاربری.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--amline-fg-muted)]">محتوای اصلی کارت اینجا قرار می‌گیرد.</p>
      </CardContent>
    </Card>
  ),
}

export const ContentOnly: Story = {
  render: () => (
    <Card className="max-w-sm p-6">
      <p className="text-sm">کارت ساده بدون هدر جداگانه.</p>
    </Card>
  ),
}
