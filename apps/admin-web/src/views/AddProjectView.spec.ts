import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type * as VueRouter from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/stores/auth';

const testMocks = vi.hoisted(() => ({
  assignMember: vi.fn(),
  createProject: vi.fn(),
  errorToast: vi.fn(),
  listMembers: vi.fn(),
  routerPush: vi.fn(),
  successToast: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof VueRouter>();

  return {
    ...actual,
    useRouter: () => ({ push: testMocks.routerPush }),
  };
});

vi.mock('@/composables/feedback/useToasts', () => ({
  useToasts: () => ({
    errorToast: testMocks.errorToast,
    successToast: testMocks.successToast,
  }),
}));

vi.mock('@/services/admin-members-client', () => ({
  adminMembersClient: {
    listMembers: testMocks.listMembers,
  },
}));

vi.mock('@/services/admin-projects-client', () => ({
  adminProjectsClient: {
    assignMember: testMocks.assignMember,
    createProject: testMocks.createProject,
  },
}));

import AddProjectView from './AddProjectView.vue';

const projectResponse = {
  color: null,
  createdAt: '2026-05-01T10:00:00.000Z',
  defaultBillableForTasks: false,
  description: null,
  id: 'project-1',
  isActive: true,
  members: [],
  name: 'Customer Portal',
  source: 'manual',
  totalSeconds: 0,
  updatedAt: '2026-05-01T10:00:00.000Z',
  visibility: 'private',
  workspaceId: 'workspace-1',
};

function mountAddProjectView() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const authStore = useAuthStore(pinia);
  authStore.accessToken = 'access-token';

  return mount(AddProjectView, {
    global: {
      plugins: [pinia],
      stubs: {
        Button: {
          props: ['disabled', 'label', 'loading', 'type', 'variant'],
          emits: ['click'],
          template:
            '<button :disabled="disabled" :type="type" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Checkbox: {
          props: ['inputId', 'name'],
          template: '<input :id="inputId" :name="name" type="checkbox" />',
        },
        Form: {
          name: 'Form',
          emits: ['submit'],
          props: ['initialValues'],
          template: `
            <form data-testid="add-project-form">
              <slot
                v-bind="{
                  defaultBillableForTasks: { invalid: false },
                  name: { invalid: false },
                  visibility: { invalid: false }
                }"
              />
              <button
                data-testid="submit-project-form"
                type="button"
                @click="$emit('submit', { valid: true, values: { ...initialValues, name: 'Customer Portal', managerUserId: 'pm-user', defaultBillableForTasks: false } })"
              />
            </form>
          `,
        },
        InputText: {
          props: ['id', 'name'],
          template: '<input :id="id" :name="name" />',
        },
        Select: {
          props: ['id', 'name', 'options'],
          template:
            '<select :id="id" :name="name"><option v-for="option in options" :key="option.value">{{ option.label }}</option></select>',
        },
      },
    },
  });
}

describe('AddProjectView', () => {
  beforeEach(() => {
    testMocks.assignMember.mockReset();
    testMocks.createProject.mockReset();
    testMocks.errorToast.mockReset();
    testMocks.listMembers.mockReset();
    testMocks.routerPush.mockReset();
    testMocks.successToast.mockReset();

    testMocks.assignMember.mockResolvedValue(undefined);
    testMocks.createProject.mockResolvedValue(projectResponse);
    testMocks.listMembers.mockResolvedValue([
      {
        avatarUrl: null,
        displayName: 'Pat PM',
        email: 'pat@example.com',
        id: 'member-1',
        joinedAt: '2026-05-01T10:00:00.000Z',
        lastActiveAt: null,
        projectsAssignedCount: 0,
        role: 'pm',
        userId: 'pm-user',
        workspaceId: 'workspace-1',
      },
    ]);
  });

  it('renders and submits the default billable setting for manual projects', async () => {
    const wrapper = mountAddProjectView();

    await flushPromises();

    expect(wrapper.text()).toContain('Default billable for new tasks');
    expect(wrapper.text()).toContain('Billable by default');
    expect(wrapper.find('input[name="defaultBillableForTasks"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('New tasks in this project inherit this value unless changed later.');

    await wrapper.get('[data-testid="submit-project-form"]').trigger('click');
    await flushPromises();

    expect(testMocks.createProject).toHaveBeenCalledWith({
      defaultBillableForTasks: false,
      name: 'Customer Portal',
      visibility: 'private',
    });
    expect(testMocks.assignMember).toHaveBeenCalledWith('project-1', 'pm-user');
    expect(testMocks.successToast).toHaveBeenCalledWith(
      '"Customer Portal" has been created successfully.',
    );
    expect(testMocks.routerPush).toHaveBeenCalledWith({ name: 'admin-projects' });
  });
});
