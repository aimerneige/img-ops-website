/* App-wide snackbar + confirm dialog services (replace alert/confirm). */
import type { IconName } from './icons';

export interface SnackItem {
  id: number;
  message: string;
  action?: string;
  onAction?: () => void;
  icon?: IconName;
  error?: boolean;
  duration: number;
}

class Snackbar {
  queue = $state<SnackItem[]>([]);
  private seq = 0;
  show(message: string, opts: Partial<Omit<SnackItem, 'id' | 'message'>> = {}) {
    const item: SnackItem = { id: ++this.seq, message, duration: opts.action ? 6000 : 3500, ...opts };
    // Only one at a time (MD3); a new one replaces the current.
    this.queue = [item];
    return item.id;
  }
  dismiss(id: number) {
    this.queue = this.queue.filter((s) => s.id !== id);
  }
}
export const snackbar = new Snackbar();

export interface ConfirmRequest {
  title: string;
  message: string;
  confirm: string;
  cancel: string;
  icon?: IconName;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

class Confirmer {
  current = $state<ConfirmRequest | null>(null);
  ask(req: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
    return new Promise((resolve) => {
      this.current = { ...req, resolve };
    });
  }
  answer(ok: boolean) {
    this.current?.resolve(ok);
    this.current = null;
  }
}
export const confirmer = new Confirmer();
