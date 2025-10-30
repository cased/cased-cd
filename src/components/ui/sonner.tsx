import { useAppearance } from '@/lib/theme'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { appearance } = useAppearance()

  return (
    <Sonner
      theme={appearance === 'light' ? 'light' : 'dark'}
      position="bottom-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-black group-[.toaster]:border-neutral-200 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-neutral-950 dark:group-[.toaster]:text-white dark:group-[.toaster]:border-neutral-800',
          description: 'group-[.toast]:text-neutral-600 dark:group-[.toast]:text-neutral-400',
          actionButton:
            'group-[.toast]:bg-black group-[.toast]:text-white dark:group-[.toast]:bg-white dark:group-[.toast]:text-black',
          cancelButton:
            'group-[.toast]:bg-neutral-100 group-[.toast]:text-neutral-600 dark:group-[.toast]:bg-neutral-800 dark:group-[.toast]:text-neutral-400',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
