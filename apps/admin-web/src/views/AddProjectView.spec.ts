import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import type * as VueRouter from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/stores/auth';

const testMocks = vi.hoisted(() => ({
  assignMember: vi.fn(),
  createProject: vi.fn(),
  errorToast: vi.fn(),
  getConnectionStatus: vi.fn(),
  listMembers: vi.fn(),
  listOwners: vi.fn(),
  listProjects: vi.fn(),
  listRepositories: vi.fn(),
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

vi.mock('@/services/admin-github-browsing-client', () => ({
  adminGitHubBrowsingClient: {
    listOwners: testMocks.listOwners,
    listProjects: testMocks.listProjects,
    listRepositories: testMocks.listRepositories,
  },
}));

vi.mock('@/services/admin-github-connection-client', () => ({
  adminGitHubConnectionClient: {
    getConnectionStatus: testMocks.getConnectionStatus,
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

const connectedGitHubStatus = {
  account: {
    avatarUrl: 'https://avatars.example.test/octo.png',
    connectedAt: '2026-05-01T10:00:00.000Z',
    githubUserId: '123456',
    login: 'octocat',
    updatedAt: '2026-05-01T10:00:00.000Z',
  },
  status: 'connected' as const,
};

const disconnectedGitHubStatus = {
  account: null,
  status: 'disconnected' as const,
};

const githubPersonalOwner = {
  avatarUrl: null,
  label: 'octocat',
  login: 'octocat',
  type: 'personal' as const,
  url: 'https://github.com/octocat',
};

const githubOrganizationOwner = {
  avatarUrl: null,
  label: 'Octo Org',
  login: 'octo-org',
  type: 'organization' as const,
  url: 'https://github.com/octo-org',
};

const githubRepository = {
  description: 'Repository project',
  fullName: 'octocat/repo',
  id: '123',
  isArchived: false,
  name: 'repo',
  nodeId: 'R_kwDO',
  owner: 'octocat',
  updatedAt: '2026-05-02T10:00:00.000Z',
  url: 'https://github.com/octocat/repo',
  visibility: 'private' as const,
};

const githubProject = {
  description: null,
  id: 'PVT_kwDO',
  number: 7,
  owner: 'octocat',
  state: 'open' as const,
  title: 'Roadmap',
  updatedAt: '2026-05-03T10:00:00.000Z',
  url: 'https://github.com/users/octocat/projects/7',
};

function createDeferred<T>() {
  // eslint-disable-next-line no-unused-vars
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

/* eslint-disable vue/no-reserved-component-names, vue/one-component-per-file, vue/order-in-components, vue/require-default-prop, vue/require-prop-types */
const FormStub = defineComponent({
  name: 'Form',
  emits: ['submit'],
  props: {
    initialValues: {
      default: () => ({}),
      type: Object,
    },
  },
  data() {
    return {
      values: {
        ...(this.initialValues as Record<string, unknown>),
        defaultBillableForTasks: false,
        managerUserId: 'pm-user',
      },
    };
  },
  methods: {
    setFieldValue(field: string, value: unknown) {
      this.values = { ...this.values, [field]: value };
    },
    submitForm() {
      this.$emit('submit', { valid: true, values: this.values });
    },
  },
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
        @click="submitForm"
      />
    </form>
  `,
});

const AutoCompleteStub = defineComponent({
  name: 'AutoComplete',
  emits: ['complete', 'update:modelValue'],
  props: {
    disabled: Boolean,
    inputId: String,
    loading: Boolean,
    modelValue: null,
    optionLabel: [String, Function],
    placeholder: String,
    suggestions: {
      default: () => [],
      type: Array,
    },
  },
  methods: {
    getLabel(value: unknown): string {
      if (!value || typeof value !== 'object') return String(value ?? '');
      if (typeof this.optionLabel === 'function') return this.optionLabel(value);
      if (typeof this.optionLabel === 'string') {
        return String((value as Record<string, unknown>)[this.optionLabel] ?? '');
      }

      return String(value);
    },
  },
  template: `
    <div :data-testid="inputId">
      <input
        :id="inputId"
        :disabled="disabled"
        :placeholder="placeholder"
        :value="getLabel(modelValue)"
        @focus="$emit('complete', { query: '' })"
      />
      <button
        v-for="(suggestion, index) in suggestions"
        :key="index"
        type="button"
        :data-testid="inputId + '-option-' + index"
        @click="$emit('update:modelValue', suggestion)"
      >
        {{ getLabel(suggestion) }}
      </button>
      <button
        type="button"
        :data-testid="inputId + '-clear'"
        @click="$emit('update:modelValue', null)"
      >
        Clear
      </button>
    </div>
  `,
});

const InputTextStub = defineComponent({
  name: 'InputText',
  emits: ['update:modelValue'],
  props: ['id', 'modelValue', 'name'],
  methods: {
    handleInput(event: Event) {
      this.$emit('update:modelValue', (event.target as HTMLInputElement).value);
    },
  },
  template:
    '<input :id="id" :name="name" :value="modelValue" @input="handleInput" />',
});
/* eslint-enable vue/no-reserved-component-names, vue/one-component-per-file, vue/order-in-components, vue/require-default-prop, vue/require-prop-types */

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
          props: ['disabled', 'label', 'loading', 'outlined', 'severity', 'type', 'variant'],
          emits: ['click'],
          template:
            '<button v-bind="$attrs" :disabled="disabled" :type="type" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Checkbox: {
          props: ['inputId', 'name'],
          template: '<input :id="inputId" :name="name" type="checkbox" />',
        },
        AutoComplete: AutoCompleteStub,
        Form: FormStub,
        InputText: InputTextStub,
        Message: {
          template: '<div><slot /></div>',
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
    testMocks.getConnectionStatus.mockReset();
    testMocks.listMembers.mockReset();
    testMocks.listOwners.mockReset();
    testMocks.listProjects.mockReset();
    testMocks.listRepositories.mockReset();
    testMocks.routerPush.mockReset();
    testMocks.successToast.mockReset();

    testMocks.assignMember.mockResolvedValue(undefined);
    testMocks.createProject.mockResolvedValue(projectResponse);
    testMocks.getConnectionStatus.mockResolvedValue(disconnectedGitHubStatus);
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
    testMocks.listOwners.mockResolvedValue({
      items: [githubPersonalOwner, githubOrganizationOwner],
    });
    testMocks.listRepositories.mockResolvedValue({
      items: [githubRepository],
      pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
    });
    testMocks.listProjects.mockResolvedValue({
      items: [githubProject],
      pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
    });
  });

  it('renders and submits the default billable setting for manual projects', async () => {
    const wrapper = mountAddProjectView();

    await flushPromises();

    expect(wrapper.text()).toContain('Default billable for new tasks');
    expect(wrapper.text()).toContain('Billable by default');
    expect(wrapper.find('input[name="defaultBillableForTasks"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('New tasks in this project inherit this value unless changed later.');
    expect(wrapper.find('[data-testid="project-create-mode"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="github-project-candidate-controls"]').exists()).toBe(false);
    expect(testMocks.getConnectionStatus).not.toHaveBeenCalled();
    expect(testMocks.listOwners).not.toHaveBeenCalled();

    await wrapper.get('input[name="name"]').setValue('Customer Portal');

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

  it('shows a retryable loading state while GitHub connection status is pending', async () => {
    const connectionRequest = createDeferred<typeof connectedGitHubStatus>();
    testMocks.getConnectionStatus.mockReturnValueOnce(connectionRequest.promise);

    const wrapper = mountAddProjectView();

    await flushPromises();
    await wrapper.get('[data-testid="select-github-project-source"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Checking GitHub connection...');
    expect(wrapper.find('input[name="name"]').exists()).toBe(false);

    connectionRequest.resolve(connectedGitHubStatus);
    await flushPromises();

    expect(wrapper.text()).toContain('GitHub owner');
  });

  it('loads connected GitHub candidates and submits repository metadata', async () => {
    testMocks.getConnectionStatus.mockResolvedValue(connectedGitHubStatus);
    const wrapper = mountAddProjectView();

    await flushPromises();
    await wrapper.get('[data-testid="select-github-project-source"]').trigger('click');
    await flushPromises();

    expect(testMocks.listOwners).toHaveBeenCalledWith({ type: 'all' });
    expect(testMocks.listRepositories).toHaveBeenCalledWith({
      limit: 100,
      ownerType: 'personal',
    });
    expect(testMocks.listProjects).toHaveBeenCalledWith({
      limit: 100,
      ownerType: 'personal',
    });
    expect(wrapper.text()).toContain('octocat (personal)');
    expect(wrapper.text()).toContain('Octo Org (organization)');
    expect(wrapper.find('input[name="name"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Project manager');
    expect(wrapper.text()).not.toContain('Default billable for new tasks');

    await wrapper.get('[data-testid="github-repository-option-0"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Selected GitHub repository: octocat/repo');
    expect(wrapper.text()).toContain('GitHub repository');
    expect(testMocks.createProject).not.toHaveBeenCalled();

    await wrapper.get('[data-testid="submit-project-form"]').trigger('click');
    await flushPromises();

    expect(testMocks.createProject).toHaveBeenCalledWith({
      defaultBillableForTasks: false,
      name: 'octocat/repo',
      providerReference: expect.objectContaining({
        externalKey: 'octocat/repo',
        externalType: 'repository',
        externalUrl: 'https://github.com/octocat/repo',
        provider: 'github',
      }),
      visibility: 'private',
    });
    expect(testMocks.assignMember).not.toHaveBeenCalled();
  });

  it('submits Project V2 metadata when a Project V2 candidate is selected', async () => {
    testMocks.getConnectionStatus.mockResolvedValue(connectedGitHubStatus);
    const wrapper = mountAddProjectView();

    await flushPromises();
    await wrapper.get('[data-testid="select-github-project-source"]').trigger('click');
    await flushPromises();

    await wrapper.get('[data-testid="github-project-v2-option-0"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('input[name="name"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Selected GitHub Project V2: Roadmap');
    expect(testMocks.createProject).not.toHaveBeenCalled();

    await wrapper.get('[data-testid="submit-project-form"]').trigger('click');
    await flushPromises();

    expect(testMocks.createProject).toHaveBeenCalledWith({
      defaultBillableForTasks: false,
      name: 'Roadmap',
      providerReference: expect.objectContaining({
        externalId: 'PVT_kwDO',
        externalKey: 'PVT_kwDO',
        externalType: 'project_v2',
        provider: 'github',
      }),
      visibility: 'private',
    });
  });

  it('clears GitHub metadata when switching back to manual entry', async () => {
    testMocks.getConnectionStatus.mockResolvedValue(connectedGitHubStatus);
    const wrapper = mountAddProjectView();

    await flushPromises();
    await wrapper.get('[data-testid="select-github-project-source"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="github-repository-option-0"]').trigger('click');
    await flushPromises();

    await wrapper.get('[data-testid="select-manual-project-source"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Selected GitHub repository');
    expect(wrapper.find('input[name="name"]').exists()).toBe(true);

    await wrapper.get('input[name="name"]').setValue('Manual fallback');

    await wrapper.get('[data-testid="submit-project-form"]').trigger('click');
    await flushPromises();

    expect(testMocks.createProject).toHaveBeenCalledWith({
      defaultBillableForTasks: false,
      name: 'Manual fallback',
      visibility: 'private',
    });
  });

  it('surfaces empty and retryable error states for candidate loading', async () => {
    testMocks.getConnectionStatus.mockResolvedValue(connectedGitHubStatus);
    testMocks.listRepositories
      .mockRejectedValueOnce(new Error('Repositories unavailable'))
      .mockResolvedValueOnce({
        items: [githubRepository],
        pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
      });
    testMocks.listProjects.mockResolvedValue({
      items: [],
      pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
    });
    const wrapper = mountAddProjectView();

    await flushPromises();
    await wrapper.get('[data-testid="select-github-project-source"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Repositories unavailable');
    expect(wrapper.text()).toContain(
      'No Projects V2 are available for this owner.',
    );
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Repositories unavailable',
      expect.objectContaining({
        logContext: { action: 'load-github-project-candidates', feature: 'projects' },
      }),
    );

    await wrapper.get('[data-testid="github-candidates-retry"]').trigger('click');
    await flushPromises();

    expect(testMocks.listRepositories).toHaveBeenCalledTimes(2);
  });
});
