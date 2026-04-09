import type { Preview } from '@storybook/react'
import '../amline-tokens.css'
import './preview.css'

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
  },
}

export default preview
