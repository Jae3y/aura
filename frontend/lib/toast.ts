// Simple toast notification system
// TODO: Replace with shadcn/ui toast when installed

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  title?: string;
  description: string;
  type?: ToastType;
  duration?: number;
}

class ToastManager {
  private toasts: Map<string, HTMLDivElement> = new Map();

  show({ title, description, type = 'info', duration = 3000 }: ToastOptions) {
    if (typeof window === 'undefined') return;

    const id = Math.random().toString(36).substring(7);
    const toast = this.createToastElement(title, description, type);
    
    document.body.appendChild(toast);
    this.toasts.set(id, toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    // Auto remove
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }

    return id;
  }

  private createToastElement(title: string | undefined, description: string, type: ToastType): HTMLDivElement {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 z-[9999] max-w-md p-4 rounded-lg shadow-lg transition-all duration-300 opacity-0 translate-y-2';
    
    const colors = {
      success: 'bg-green-900 border border-green-500 text-green-100',
      error: 'bg-red-900 border border-red-500 text-red-100',
      warning: 'bg-amber-900 border border-amber-500 text-amber-100',
      info: 'bg-blue-900 border border-blue-500 text-blue-100',
    };

    toast.className += ` ${colors[type]}`;

    const content = `
      ${title ? `<div class="font-semibold mb-1">${title}</div>` : ''}
      <div class="text-sm">${description}</div>
    `;

    toast.innerHTML = content;
    return toast;
  }

  private remove(id: string) {
    const toast = this.toasts.get(id);
    if (toast) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        toast.remove();
        this.toasts.delete(id);
      }, 300);
    }
  }
}

const toastManager = new ToastManager();

export const toast = {
  success: (description: string, title?: string) =>
    toastManager.show({ title, description, type: 'success' }),
  error: (description: string, title?: string) =>
    toastManager.show({ title, description, type: 'error' }),
  warning: (description: string, title?: string) =>
    toastManager.show({ title, description, type: 'warning' }),
  info: (description: string, title?: string) =>
    toastManager.show({ title, description, type: 'info' }),
};
