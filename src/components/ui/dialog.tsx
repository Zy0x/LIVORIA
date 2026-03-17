import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  registerEntry,
  removeFromStack,
  handleManualClose,
} from '@/lib/backGestureSystem';

// ── Dialog component ──────────────────────────────────────────────────────────
// Terintegrasi penuh dengan backGestureSystem.ts.
// Setiap <Dialog open={true}> otomatis mendaftar ke stack terpusat
// dan merespons back gesture (tombol back Android / browser back button).
//
// TIDAK PERLU useBackGesture di komponen yang memakai <Dialog>.

const Dialog = ({ open, onOpenChange, ...props }: DialogPrimitive.DialogProps) => {
  const uidRef = React.useRef<number | null>(null);
  const closedByGestureRef = React.useRef(false);

  // Saat dialog DIBUKA
  React.useEffect(() => {
    if (open) {
      // Guard duplikat (React StrictMode double-invoke)
      if (uidRef.current !== null) return;

      closedByGestureRef.current = false;

      const { uid } = registerEntry(`dialog`, () => {
        // Dipanggil dari handlePopstate (back gesture dari user)
        closedByGestureRef.current = true;
        uidRef.current = null;
        onOpenChange?.(false);
      });

      uidRef.current = uid;

      return () => {
        // Cleanup saat open berubah atau komponen unmount
        if (uidRef.current !== null) {
          removeFromStack(uidRef.current);
          uidRef.current = null;
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Saat dialog DITUTUP (oleh tombol X, overlay click, atau programmatic)
  React.useEffect(() => {
    if (!open && uidRef.current !== null) {
      const uid = uidRef.current;
      const wasByGesture = closedByGestureRef.current;

      uidRef.current = null;
      closedByGestureRef.current = false;

      if (wasByGesture) {
        // Ditutup via back gesture → history sudah mundur oleh browser
        return;
      }

      // Ditutup via tombol/overlay → kita perlu sync history
      handleManualClose(uid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} {...props} />;
};

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-4 sm:p-6 shadow-lg duration-200 rounded-xl sm:rounded-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};