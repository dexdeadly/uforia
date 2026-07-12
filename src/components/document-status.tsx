import { CheckCircle2, Loader2, AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DocStatus = 'pending' | 'processing' | 'ready' | 'error'

const CONFIG: Record<
  DocStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Queued',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  processing: {
    label: 'Processing',
    className: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  ready: {
    label: 'Ready',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  error: {
    label: 'Error',
    className: 'bg-red-500/15 text-red-300 border-red-500/30',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
}

/** Small pill that reflects a document's processing status. */
export function DocumentStatus({ status }: { status: string }) {
  const cfg = CONFIG[(status as DocStatus)] ?? CONFIG.pending
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        cfg.className,
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}
