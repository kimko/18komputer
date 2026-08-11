import { createToaster } from '@chakra-ui/react';

export const toaster = createToaster({ placement: 'bottom-end', pauseOnPageIdle: true });

const SHEET_OUTCOMES = {
  created: 'Game saved',
  updated: 'Game updated',
  unchanged: 'No changes'
};

export function toastSheetOutcome(outcome) {
  const title = SHEET_OUTCOMES[outcome];
  if (!title) return;
  toaster.create({ title, type: outcome === 'unchanged' ? 'info' : 'success', duration: 2500 });
}
