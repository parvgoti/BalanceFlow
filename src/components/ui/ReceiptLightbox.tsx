import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ExternalLink, X, ZoomIn, ZoomOut } from 'lucide-react'

interface ReceiptLightboxProps {
  url: string | null
  description?: string
  isOpen: boolean
  onClose: () => void
}

export function ReceiptLightbox({ url, description, isOpen, onClose }: ReceiptLightboxProps) {
  const [zoom, setZoom] = useState(1)

  if (!url) return null

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl p-4 overflow-hidden bg-white dark:bg-gray-900 rounded-2xl">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 mb-3">
          <DialogTitle className="text-base font-bold text-gray-900 dark:text-white truncate pr-4">
            Receipt: {description || 'Expense Document'}
          </DialogTitle>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 0.25, 2.5))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </DialogHeader>

        <div className="relative flex items-center justify-center min-h-[350px] max-h-[75vh] overflow-auto bg-gray-50 dark:bg-gray-950 rounded-xl p-4">
          <img
            src={url}
            alt={description || 'Receipt'}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            className="max-h-full max-w-full object-contain transition-transform duration-200 rounded-lg shadow-sm"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}