import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Select from 'primevue/select';
import type * as VueRouter from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/stores/auth';

const testMocks = vi.hoisted(() => ({
  assignMember: vi.fn(),
  createProject: vi.fn(),
  errorToast: vi.fn(),
  importGitHubProjects: vi.fn(),
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
  adminMembersClient: { listMembers: testMocks.listMembers },
}));

vi.mock('@/services/admin-projects-client', () => ({
  adminProjectsClient: {
    assignMember: testMocks.assignMember,
    createProject: testMocks.createProject,
    importGitHubProjects: testMocks.importGitHubProjects,
  },
}));

import AddProjectView from './AddProjectView.vue';

window.matchMedia ??= ((query: string) => ({
  addEventListener: () => {},
  addListener: () => {},
  dispatchEvent: () => false,
  matches: false,
  media: query,
  onchange: null,
  removeEventListener: () => {},
  removeListener: () => {},
})) as unknown as typeof window.matchMedia;

function mountWithRealForm() {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore(pinia).accessToken = 'access-token';

  return mount(AddProjectView, {
    attachTo: document.body,
    global: {
      plugins: [pinia, [PrimeVue, {}]],
      stubs: {
        GitHubProjectFields: {
          props: ['availability', 'disabled', 'modelValue', 'scanning'],
          template: '<div data-testid="github-fields-stub" />',
        },
      },
    },
  });
}

function sourceSelect(wrapper: ReturnType<typeof mountWithRealForm>) {
  return wrapper
    .findAllComponents(Select)
    .find((select) => select.props('inputId') === 'project-source')!;
}

async function setSource(
  wrapper: ReturnType<typeof mountWithRealForm>,
  value: 'manual' | 'github',
) {
  sourceSelect(wrapper).vm.$emit('update:modelValue', value);
  await flushPromises();
}

function nameInput(wrapper: ReturnType<typeof mountWithRealForm>) {
  return wrapper.find('#project-name');
}

async function submit(wrapper: ReturnType<typeof mountWithRealForm>) {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

describe('AddProjectView with the real PrimeVue form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testMocks.listMembers.mockResolvedValue([]);
    testMocks.createProject.mockResolvedValue({ id: 'project-1' });
  });

  it('creates the project the visible name says', async () => {
    const wrapper = mountWithRealForm();
    await flushPromises();

    await nameInput(wrapper).setValue('Customer Portal');
    await submit(wrapper);

    expect(testMocks.createProject).toHaveBeenCalledWith({
      defaultBillableForTasks: true,
      name: 'Customer Portal',
      visibility: 'private',
    });
  });

  it('forgets a name the user can no longer see after switching source', async () => {
    const wrapper = mountWithRealForm();
    await flushPromises();

    await nameInput(wrapper).setValue('Customer Portal');
    await setSource(wrapper, 'github');

    expect(nameInput(wrapper).exists()).toBe(false);
    expect(
      wrapper.get('[data-testid="github-import-derived-name"]').text(),
    ).toBe('—');

    await setSource(wrapper, 'manual');

    expect((nameInput(wrapper).element as HTMLInputElement).value).toBe('');

    await submit(wrapper);

    expect(testMocks.createProject).not.toHaveBeenCalled();
    expect(testMocks.successToast).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Project name is required');
  });

  it('accepts a fresh name after the round trip', async () => {
    const wrapper = mountWithRealForm();
    await flushPromises();

    await nameInput(wrapper).setValue('Customer Portal');
    await setSource(wrapper, 'github');
    await setSource(wrapper, 'manual');
    await nameInput(wrapper).setValue('Second Try');
    await submit(wrapper);

    expect(testMocks.createProject).toHaveBeenCalledWith({
      defaultBillableForTasks: true,
      name: 'Second Try',
      visibility: 'private',
    });
  });

  it('refuses to submit a GitHub import with nothing chosen', async () => {
    const wrapper = mountWithRealForm();
    await flushPromises();

    await setSource(wrapper, 'github');
    await submit(wrapper);

    expect(testMocks.importGitHubProjects).not.toHaveBeenCalled();
    expect(testMocks.createProject).not.toHaveBeenCalled();
  });
});
