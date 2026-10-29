import type { ReactNode } from 'react'
import { AudioWaveform } from 'lucide-react'

interface AuthCardProps {
  title: string
  subtitle: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export default function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#0f0f0f] px-4 py-8">
      <div className="w-full max-w-[440px] md:rounded-[8px] md:border md:border-[#2e2e2e] md:bg-card md:p-6 md:shadow-[0_0_50px_rgba(0,0,0,0.25)]">
        <header className="mb-6 flex flex-col items-center gap-2 text-center">
          <AudioWaveform aria-hidden="true" className="hidden size-8 text-primary md:block" />
          <h1 className="text-base font-bold text-foreground md:text-2xl md:font-semibold md:tracking-[-0.6px] md:text-accent-foreground">
            {title}
          </h1>
          <div className="max-w-80 text-base text-muted-foreground md:text-sm">{subtitle}</div>
        </header>
        <div className="flex flex-col gap-6 rounded-[8px] border border-[#2e2e2e] bg-card p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)] md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          {children}
          {footer && (
            <footer className="border-t border-border pt-6 text-center text-[11px] text-placeholder md:text-xs md:leading-[19.5px] md:tracking-[0.6px]">
              {footer}
            </footer>
          )}
        </div>
      </div>
    </main>
  )
}
