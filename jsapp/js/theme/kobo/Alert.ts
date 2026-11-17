import { Alert } from '@mantine/core'
import type { AlertType } from '#/components/common/alert'
import classes from './Alert.module.css'

declare module '@mantine/core' {
  export interface AlertProps {
    type: AlertType
  }
}

export const AlertThemeKobo = Alert.extend({
  classNames: classes,
  vars: (theme, props) => {
    // OC-29218 (WCAG 2.2 AA): icon and title colours are the dark shade of
    // each status, so they reach 4.5:1 on the light alert background.
    return {
      root: {
        ...(props.type === 'default' && {
          '--alert-bg': theme.colors.gray[7],
          '--alert-color': theme.colors.gray[2], // 5.21:1, was gray[4] (1.95:1)
        }),
        ...(props.type === 'error' && {
          '--alert-bg': theme.colors.red[9],
          '--alert-color': theme.colors.red[6], // 5.57:1, was red[7] (2.09:1)
        }),
        ...(props.type === 'info' && {
          '--alert-bg': theme.colors.blue[9],
          '--alert-color': theme.colors.blue[4], // 7.19:1, was blue[6] (4.32:1)
        }),
        ...(props.type === 'success' && {
          '--alert-bg': theme.colors.teal[6],
          '--alert-color': theme.colors.teal[2], // 5.81:1, was teal[4] (1.60:1)
        }),
        ...(props.type === 'warning' && {
          '--alert-bg': theme.colors.amber[7],
          '--alert-color': theme.colors.amber[5], // 6.72:1, was amber[6] (1.37:1)
        }),
      },
    }
  },
})
