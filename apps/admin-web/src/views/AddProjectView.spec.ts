import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type * as VueRouter from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@gitiempo/web-shared/http';
import { useAuthStore } from '@/stores/auth';
import { toBoardOption } from '@/components/projects/github-project-import';

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
  adminMembersClient: {
    listMembers: testMocks.listMembers,
  },
}));

vi.mock('@/services/admin-projects-client', () => ({
  adminProjectsClient: {
    assignMember: testMocks.assignMember,
    createProject: testMocks.createProject,
    importGitHubProjects: testMocks.importGitHubProjects,
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

const board = {
  id: 'PVT_Krvn',
  number: 9,
  title: 'Krvn',
  owner: 'ITSUA-team',
  state: 'open' as const,
  description: null,
  url: 'https://github.com/orgs/ITSUA-team/projects/9',
  updatedAt: '2026-08-03T10:00:00.000Z',
};

const summary = {
  errorMessage: null,
  hasMore: false,
  repositories: ['ITSUA-team/GiTiempo'],
  skipped: { draftIssues: 0, pullRequests: 0, redacted: 0, unknown: 0 },
  totalItems: 24,
};

let selectedOption = toBoardOption(board, summary, new Map(), new Map());
let formValues: Record<string, unknown> = {};

const GitHubProjectFieldsStub = {
  name: 'GitHubProjectFieldsStub',
  props: ['availability', 'disabled', 'modelValue', 'scanning'],
  emits: ['update:availability', 'update:modelValue', 'update:scanning'],
  template: `
    <div data-testid="github-fields-stub">
      <button
        data-testid="pick-github-project"
        type="button"
        @click="$emit('update:modelValue', option)"
      />
      <button
        data-testid="clear-github-project"
        type="button"
        @click="$emit('update:modelValue', null)"
      />
    </div>
  `,
  computed: {
    option() {
      return selectedOption;
    },
  },
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
            '<button :data-testid="$attrs[\'data-testid\']" :disabled="disabled" :type="type" @click="$emit(\'click\')">{{ label }}</button>',
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
                  defaultBillableForTasks: { invalid: false, value: values.defaultBillableForTasks },
                  managerUserId: { invalid: false, value: values.managerUserId },
                  name: { invalid: false, value: values.name },
                  visibility: { invalid: false, value: values.visibility }
                }"
              />
              <button
                data-testid="submit-project-form"
                type="button"
                @click="$emit('submit', { valid: true, values })"
              />
            </form>
          `,
          data() {
            return { overrides: {} as Record<string, unknown> };
          },
          methods: {
            setFieldValue(field: string, value: unknown) {
              this.overrides = { ...this.overrides, [field]: value };
            },
          },
          computed: {
            values() {
              return { ...this.initialValues, ...formValues, ...this.overrides };
            },
          },
        },
        GitHubProjectFields: GitHubProjectFieldsStub,
        InputText: {
          props: ['id', 'name'],
          template: '<input :id="id" :name="name" />',
        },
        Message: { template: '<div><slot /></div>' },
        Select: {
          props: ['id', 'inputId', 'modelValue', 'name', 'options'],
          emits: ['update:modelValue'],
          template: `
            <select
              :id="id ?? inputId"
              :data-testid="$attrs['data-testid']"
              :name="name"
              :value="modelValue"
              @change="$emit('update:modelValue', $event.target.value)"
            >
              <option v-for="option in options" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          `,
        },
      },
    },
  });
}

async function switchToGitHub(wrapper: ReturnType<typeof mountAddProjectView>) {
  const source = wrapper.get('[data-testid="project-source"]');
  (source.element as HTMLSelectElement).value = 'github';
  await source.trigger('change');
}

describe('AddProjectView', () => {
  beforeEach(() => {
    testMocks.assignMember.mockReset();
    testMocks.createProject.mockReset();
    testMocks.errorToast.mockReset();
    testMocks.importGitHubProjects.mockReset();
    testMocks.listMembers.mockReset();
    testMocks.routerPush.mockReset();
    testMocks.successToast.mockReset();

    selectedOption = toBoardOption(board, summary, new Map(), new Map());
    formValues = {
      defaultBillableForTasks: false,
      managerUserId: 'pm-user',
      name: 'Customer Portal',
      visibility: 'private',
    };

    testMocks.assignMember.mockResolvedValue(undefined);
    testMocks.createProject.mockResolvedValue(projectResponse);
    testMocks.importGitHubProjects.mockResolvedValue({
      results: [
        {
          githubProjectId: 'PVT_Krvn',
          linkedRepository: 'ITSUA-team/GiTiempo',
          message: null,
          projectId: 'project-9',
          status: 'imported',
        },
      ],
    });
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
    expect(wrapper.find('[data-testid="github-fields-stub"]').exists()).toBe(false);

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

  it('keeps the shared settings fields in both source modes', async () => {
    const wrapper = mountAddProjectView();
    await flushPromises();

    expect(wrapper.find('#project-name').exists()).toBe(true);

    await switchToGitHub(wrapper);

    expect(wrapper.find('[data-testid="github-fields-stub"]').exists()).toBe(true);
    expect(wrapper.find('#project-name').exists()).toBe(false);
    expect(wrapper.find('#project-manager').exists()).toBe(true);
    expect(wrapper.find('#visibility').exists()).toBe(true);
    expect(wrapper.find('input[name="defaultBillableForTasks"]').exists()).toBe(true);
  });

  it('derives the project name from the chosen GitHub project', async () => {
    const wrapper = mountAddProjectView();
    await flushPromises();
    await switchToGitHub(wrapper);

    expect(wrapper.get('[data-testid="github-import-derived-name"]').text()).toBe('—');

    await wrapper.get('[data-testid="pick-github-project"]').trigger('click');

    expect(wrapper.get('[data-testid="github-import-derived-name"]').text()).toBe(
      'ITSUA-team/Krvn',
    );
    expect(wrapper.get('[data-testid="github-import-linked-repository"]').text()).toBe(
      'ITSUA-team/GiTiempo',
    );
  });

  it('sends the chosen settings with the import and assigns the manager', async () => {
    formValues = {
      defaultBillableForTasks: false,
      managerUserId: 'pm-user',
      name: '',
      visibility: 'public',
    };
    const wrapper = mountAddProjectView();
    await flushPromises();
    await switchToGitHub(wrapper);
    await wrapper.get('[data-testid="pick-github-project"]').trigger('click');

    await wrapper.get('[data-testid="submit-project-form"]').trigger('click');
    await flushPromises();

    expect(testMocks.importGitHubProjects).toHaveBeenCalledWith({
      githubProjects: [
        {
          defaultBillableForTasks: false,
          githubProjectId: 'PVT_Krvn',
          githubRepos: ['ITSUA-team/GiTiempo'],
          visibility: 'public',
        },
      ],
    });
    expect(testMocks.createProject).not.toHaveBeenCalled();
    expect(testMocks.assignMember).toHaveBeenCalledWith('project-9', 'pm-user');
    expect(testMocks.successToast).toHaveBeenCalledWith(
      '"ITSUA-team/Krvn" has been created successfully.',
    );
  });

  it('names the settings and the manager in the outcome sentence', async () => {
    const wrapper = mountAddProjectView();
    await flushPromises();
    await switchToGitHub(wrapper);
    await wrapper.get('[data-testid="pick-github-project"]').trigger('click');

    const details = wrapper.get('[data-testid="github-import-details"]').text();

    expect(details).toContain('as a private project, not billable by default');
    expect(details).toContain('with Pat PM as manager');
    expect(details).toContain('links ITSUA-team/GiTiempo');
  });

  it('refuses to submit a GitHub import with no project chosen', async () => {
    const wrapper = mountAddProjectView();
    await flushPromises();
    await switchToGitHub(wrapper);

    expect(
      wrapper.get('[data-testid="add-project-submit"]').attributes('disabled'),
    ).toBeDefined();

    await wrapper.get('[data-testid="submit-project-form"]').trigger('click');
    await flushPromises();

    expect(testMocks.importGitHubProjects).not.toHaveBeenCalled();
  });

  it('refuses to submit a project that is already imported', async () => {
    selectedOption = toBoardOption(
      board,
      summary,
      new Map([['PVT_Krvn', { linkedRepository: null, projectId: 'p1' }]]),
      new Map(),
    );
    const wrapper = mountAddProjectView();
    await flushPromises();
    await switchToGitHub(wrapper);
    await wrapper.get('[data-testid="pick-github-project"]').trigger('click');

    expect(
      wrapper.get('[data-testid="add-project-submit"]').attributes('disabled'),
    ).toBeDefined();

    await wrapper.get('[data-testid="submit-project-form"]').trigger('click');
    await flushPromises();

    expect(testMocks.importGitHubProjects).not.toHaveBeenCalled();
  });

  it('reports a name conflict on the field instead of a toast', async () => {
    testMocks.createProject.mockRejectedValue(
      new ApiError('A project named "Customer Portal" already exists in this workspace.', {
        code: null,
        status: 409,
      }),
    );
    const wrapper = mountAddProjectView();
    await flushPromises();

    await wrapper.get('[data-testid="submit-project-form"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="project-name-conflict"]').text()).toContain(
      'already exists in this workspace',
    );
    expect(testMocks.errorToast).not.toHaveBeenCalled();
    expect(testMocks.routerPush).not.toHaveBeenCalled();
  });

  it('still toasts a failure that is not a name conflict', async () => {
    testMocks.createProject.mockRejectedValue(
      new ApiError('Server exploded', { code: null, status: 500 }),
    );
    const wrapper = mountAddProjectView();
    await flushPromises();

    await wrapper.get('[data-testid="submit-project-form"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="project-name-conflict"]').exists()).toBe(false);
    expect(testMocks.errorToast).toHaveBeenCalled();
  });

  it('reports a repository already tracked by another project in place', async () => {
    testMocks.importGitHubProjects.mockResolvedValue({
      results: [
        {
          githubProjectId: 'PVT_Krvn',
          linkedRepository: 'ITSUA-team/Kesher',
          message: 'ITSUA-team/Kesher is already tracked by Kesher.',
          projectId: null,
          status: 'repository-taken',
          trackingProject: { id: 'p9', isActive: true, name: 'Kesher' },
        },
      ],
    });
    const wrapper = mountAddProjectView();
    await flushPromises();
    await switchToGitHub(wrapper);
    await wrapper.get('[data-testid="pick-github-project"]').trigger('click');
    await wrapper.get('[data-testid="submit-project-form"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('already tracked by Kesher');
    expect(testMocks.routerPush).not.toHaveBeenCalled();
    expect(testMocks.successToast).not.toHaveBeenCalled();
  });

  it('surfaces a failed import instead of navigating away', async () => {
    testMocks.importGitHubProjects.mockResolvedValue({
      results: [
        {
          githubProjectId: 'PVT_Krvn',
          linkedRepository: null,
          message: 'The ITSUA-team organization is not approved for this workspace.',
          projectId: null,
          status: 'failed',
        },
      ],
    });
    const wrapper = mountAddProjectView();
    await flushPromises();
    await switchToGitHub(wrapper);
    await wrapper.get('[data-testid="pick-github-project"]').trigger('click');

    await wrapper.get('[data-testid="submit-project-form"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('is not approved for this workspace');
    expect(testMocks.assignMember).not.toHaveBeenCalled();
    expect(testMocks.routerPush).not.toHaveBeenCalled();
  });

  it('clears the derived name when the project is cleared', async () => {
    const wrapper = mountAddProjectView();
    await flushPromises();
    await switchToGitHub(wrapper);
    await wrapper.get('[data-testid="pick-github-project"]').trigger('click');
    await wrapper.get('[data-testid="clear-github-project"]').trigger('click');

    expect(wrapper.get('[data-testid="github-import-derived-name"]').text()).toBe('—');
    expect(wrapper.find('[data-testid="github-import-details"]').exists()).toBe(false);
  });
});
