import { mount } from '@vue/test-utils';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';
import { ManagementTableShell } from '@gitiempo/web-shared';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PendingInvitationsCard from './PendingInvitationsCard.vue';

function mockMatchMedia(matches = false): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

function createInvites() {
  return [
    {
      createdAt: '2026-05-01T10:00:00.000Z',
      email: 'maya@example.com',
      expiresAt: '2026-05-30T10:00:00.000Z',
      id: 'invite-1',
      invitedBy: '55555555-5555-4555-8555-555555555555',
      role: 'pm' as const,
      status: 'pending' as const,
      workspaceId: '33333333-3333-4333-8333-333333333333',
    },
  ];
}

function mountPendingInvitationsCard(
  options: {
    errorMessage?: string | null;
    loading?: boolean;
    pendingInvites?: ReturnType<typeof createInvites>;
  } = {},
) {
  return mount(PendingInvitationsCard, {
    props: {
      errorMessage: options.errorMessage ?? null,
      loading: options.loading ?? false,
      pendingInvites: options.pendingInvites ?? createInvites(),
    },
    global: {
      directives: {
        tooltip: {
          mounted(el, binding) {
            el.setAttribute('data-tooltip', String(binding.value));
          },
        },
      },
      plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
    },
  });
}

describe('PendingInvitationsCard', () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  it('renders desktop invitation actions as icon-only controls with accessible labels', () => {
    const wrapper = mountPendingInvitationsCard();
    const tableShell = wrapper.getComponent(ManagementTableShell);

    const resendButton = wrapper.get('[data-testid="pending-invite-resend-invite-1"]');
    const cancelButton = wrapper.get('[data-testid="pending-invite-cancel-invite-1"]');

    expect(tableShell.props('headerClass')).toContain('min-w-[860px]');
    expect(tableShell.props('singleScroll')).toBe(true);
    expect(wrapper.text()).toContain('Pending Invitations');
    expect(wrapper.text()).toContain('maya@example.com');
    expect(wrapper.text()).toContain('PM');
    expect(resendButton.attributes('aria-label')).toBe('Resend invite');
    expect(resendButton.attributes('data-tooltip')).toBe('Resend invite');
    expect(resendButton.text()).toBe('');
    expect(cancelButton.attributes('aria-label')).toBe('Cancel invite');
    expect(cancelButton.attributes('data-tooltip')).toBe('Cancel invite');
    expect(cancelButton.text()).toBe('');
  });

  it('emits desktop resend and cancel actions with the clicked invite', async () => {
    const pendingInvites = createInvites();
    const wrapper = mountPendingInvitationsCard({ pendingInvites });

    await wrapper.get('[data-testid="pending-invite-resend-invite-1"]').trigger('click');
    await wrapper.get('[data-testid="pending-invite-cancel-invite-1"]').trigger('click');

    expect(wrapper.emitted('resend')).toEqual([[pendingInvites[0]]]);
    expect(wrapper.emitted('cancel')).toEqual([[pendingInvites[0]]]);
  });

  it('renders mobile cards with the same fields and action labels', () => {
    mockMatchMedia(true);

    const wrapper = mountPendingInvitationsCard();

    expect(wrapper.findAll('[data-testid="pending-invite-mobile-card"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('maya@example.com');
    expect(wrapper.text()).toContain('Role');
    expect(wrapper.text()).toContain('Expires');
    expect(
      wrapper.get('[data-testid="pending-invite-mobile-resend-invite-1"]').attributes(
        'aria-label',
      ),
    ).toBe('Resend invite');
    expect(
      wrapper.get('[data-testid="pending-invite-mobile-cancel-invite-1"]').attributes(
        'aria-label',
      ),
    ).toBe('Cancel invite');
  });

  it('keeps sent-date fallback copy local to the invitations card', () => {
    const pendingInvites = createInvites();
    pendingInvites[0].createdAt = 'not-a-date';

    const wrapper = mountPendingInvitationsCard({ pendingInvites });

    expect(wrapper.text()).toContain('Sent recently');
  });

  it('emits mobile resend and cancel actions with the clicked invite', async () => {
    mockMatchMedia(true);
    const pendingInvites = createInvites();
    const wrapper = mountPendingInvitationsCard({ pendingInvites });

    await wrapper
      .get('[data-testid="pending-invite-mobile-resend-invite-1"]')
      .trigger('click');
    await wrapper
      .get('[data-testid="pending-invite-mobile-cancel-invite-1"]')
      .trigger('click');

    expect(wrapper.emitted('resend')).toEqual([[pendingInvites[0]]]);
    expect(wrapper.emitted('cancel')).toEqual([[pendingInvites[0]]]);
  });

  it('renders a distinct empty state when no pending invitations are loaded', () => {
    const wrapper = mountPendingInvitationsCard({
      pendingInvites: [],
    });

    expect(wrapper.text()).toContain('No pending invitations');
    expect(wrapper.text()).toContain(
      'New invites will appear here until they are accepted or canceled.',
    );
    expect(wrapper.text()).not.toContain('Failed to load pending invitations');
  });

  it('renders a retryable request-error state when pending invitations fail to load', async () => {
    const wrapper = mountPendingInvitationsCard({
      errorMessage: 'Invite service unavailable',
      pendingInvites: [],
    });

    expect(wrapper.text()).toContain('Failed to load pending invitations');
    expect(wrapper.text()).toContain('Invite service unavailable');

    await wrapper.get('button').trigger('click');

    expect(wrapper.emitted('retry')).toHaveLength(1);
  });
});
