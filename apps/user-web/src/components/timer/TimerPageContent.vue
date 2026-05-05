<script setup lang="ts">
  import { computed } from 'vue';
  import Button from 'primevue/button';
  import DatePicker from 'primevue/datepicker';
  import ProgressSpinner from 'primevue/progressspinner';
  import Select from 'primevue/select';
  import { ProjectPageHeader } from '@gitiempo/web-shared';

  import { useTimerPage } from '@/composables/useTimerPage';

  const {
    currentTimerErrorMessage,
    elapsedTimeLabel,
    handlePrimaryAction,
    hasProjects,
    hasTasks,
    isLoadingCurrentTimer,
    isLoadingProjects,
    isLoadingTasks,
    isManualSubmitDisabled,
    isPrimaryActionDisabled,
    isPrimaryActionPending,
    isProjectSelectDisabled,
    isSubmittingManualEntry,
    isTaskSelectDisabled,
    manualDate,
    manualEndTime,
    manualEntryErrorMessage,
    manualStartTime,
    primaryActionLabel,
    projectOptions,
    projectsErrorMessage,
    selectedProjectId,
    selectedTaskId,
    setSelectedProjectId,
    setSelectedTaskId,
    submitManualEntry,
    taskOptions,
    tasksErrorMessage,
    timerActionErrorMessage,
    timerContextLabel,
    timerStatusLabel,
  } = useTimerPage();

  const selectedProjectModel = computed({
    get: () => selectedProjectId.value,
    set: (value: string | null | undefined) => {
      setSelectedProjectId(value ?? null);
    },
  });

  const selectedTaskModel = computed({
    get: () => selectedTaskId.value,
    set: (value: string | null | undefined) => {
      setSelectedTaskId(value ?? null);
    },
  });
</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <ProjectPageHeader
      title="Timer"
      subtitle="Start tracking work from your visible projects and tasks or log a manual interval."
      title-size="lg"
    />

    <div class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section
        class="border-divider bg-surface shadow-card rounded-lg border p-4"
      >
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-text-dark text-base font-semibold">
              Task Selection
            </h2>
            <p class="text-text-muted text-xs">
              Choose a visible project and task before starting a new timer.
            </p>
          </div>

          <div
            v-if="isLoadingProjects && !hasProjects"
            class="bg-app-bg flex min-h-28 items-center justify-center rounded-lg"
          >
            <ProgressSpinner
              stroke-width="3"
              style="width: 40px; height: 40px"
            />
          </div>

          <div
            v-else-if="projectsErrorMessage"
            class="border-destructive/20 bg-destructive/5 rounded-lg border p-4"
          >
            <p class="text-destructive text-sm font-medium">
              Could not load visible projects.
            </p>
            <p class="text-destructive mt-1 text-xs">
              {{ projectsErrorMessage }}
            </p>
          </div>

          <div v-else-if="!hasProjects" class="bg-app-bg rounded-lg p-4">
            <p class="text-text-dark text-sm font-medium">
              No visible projects yet.
            </p>
            <p class="text-text-muted mt-1 text-xs">
              Once projects are visible to you, they will appear here for timer
              tracking.
            </p>
          </div>

          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
              <label
                for="timer-project"
                class="text-text-dark text-[13px] font-medium"
              >
                Project
              </label>
              <Select
                v-model="selectedProjectModel"
                input-id="timer-project"
                :options="projectOptions"
                option-label="name"
                option-value="id"
                placeholder="Select a project"
                filter
                fluid
                :disabled="isProjectSelectDisabled"
                :loading="isLoadingProjects"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label
                for="timer-task"
                class="text-text-dark text-[13px] font-medium"
              >
                Task
              </label>
              <Select
                v-model="selectedTaskModel"
                input-id="timer-task"
                :options="taskOptions"
                option-label="title"
                option-value="id"
                placeholder="Select a task"
                filter
                fluid
                :disabled="isTaskSelectDisabled"
                :loading="isLoadingTasks"
              />
            </div>

            <div
              v-if="tasksErrorMessage"
              class="border-destructive/20 bg-destructive/5 rounded-lg border p-3"
            >
              <p class="text-destructive text-sm font-medium">
                Could not load tasks for this project.
              </p>
              <p class="text-destructive mt-1 text-xs">
                {{ tasksErrorMessage }}
              </p>
            </div>

            <div
              v-else-if="selectedProjectId && !isLoadingTasks && !hasTasks"
              class="bg-app-bg rounded-lg p-3"
            >
              <p class="text-text-dark text-sm font-medium">
                No tasks available in this project.
              </p>
              <p class="text-text-muted mt-1 text-xs">
                Pick another project or add a task before starting a timer.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        class="border-divider bg-surface shadow-card rounded-lg border p-4 sm:p-5"
      >
        <div
          class="flex h-full flex-col gap-6 xl:min-h-[440px] xl:justify-between"
        >
          <div class="flex flex-col gap-4">
            <div
              v-if="currentTimerErrorMessage"
              class="border-destructive/20 bg-destructive/5 rounded-lg border p-3"
            >
              <p class="text-destructive text-sm font-medium">
                Could not refresh the current timer state.
              </p>
              <p class="text-destructive mt-1 text-xs">
                {{ currentTimerErrorMessage }}
              </p>
            </div>

            <div
              class="bg-app-bg flex flex-col items-center gap-3 rounded-lg px-4 py-6 text-center sm:px-6 sm:py-8"
            >
              <div
                v-if="isLoadingCurrentTimer"
                class="flex min-h-10 items-center justify-center"
              >
                <ProgressSpinner
                  stroke-width="3"
                  style="width: 32px; height: 32px"
                />
              </div>
              <template v-else>
                <p
                  class="text-text-muted text-xs font-medium uppercase tracking-wide"
                >
                  {{ timerStatusLabel }}
                </p>
                <p class="text-brand text-5xl font-semibold tabular-nums">
                  {{ elapsedTimeLabel }}
                </p>
                <p class="text-text-dark text-sm font-medium">
                  {{ timerContextLabel }}
                </p>
              </template>

              <Button
                type="button"
                class="w-full sm:w-[180px]"
                :disabled="isPrimaryActionDisabled"
                :label="primaryActionLabel"
                :loading="isPrimaryActionPending"
                @click="handlePrimaryAction"
              />
            </div>

            <div
              v-if="timerActionErrorMessage"
              class="border-destructive/20 bg-destructive/5 rounded-lg border p-3"
            >
              <p class="text-destructive text-sm font-medium">
                The timer action did not complete.
              </p>
              <p class="text-destructive mt-1 text-xs">
                {{ timerActionErrorMessage }}
              </p>
            </div>
          </div>

          <section class="bg-app-bg rounded-lg p-4">
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-1">
                <h2 class="text-text-dark text-base font-semibold">
                  Manual Interval
                </h2>
                <p class="text-text-muted text-xs">
                  Log a completed interval for the selected task.
                </p>
              </div>

              <div
                class="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
              >
                <div class="flex flex-col gap-1">
                  <label
                    for="manual-date"
                    class="text-text-dark text-[13px] font-medium"
                  >
                    Date
                  </label>
                  <DatePicker
                    v-model="manualDate"
                    input-id="manual-date"
                    date-format="M d, yy"
                    fluid
                    :disabled="isSubmittingManualEntry"
                    :manual-input="false"
                  />
                </div>

                <div class="flex flex-col gap-1">
                  <label
                    for="manual-start-time"
                    class="text-text-dark text-[13px] font-medium"
                  >
                    Start
                  </label>
                  <DatePicker
                    v-model="manualStartTime"
                    input-id="manual-start-time"
                    fluid
                    hour-format="24"
                    time-only
                    :disabled="isSubmittingManualEntry"
                    :manual-input="false"
                  />
                </div>

                <div class="flex flex-col gap-1">
                  <label
                    for="manual-end-time"
                    class="text-text-dark text-[13px] font-medium"
                  >
                    End
                  </label>
                  <DatePicker
                    v-model="manualEndTime"
                    input-id="manual-end-time"
                    fluid
                    hour-format="24"
                    time-only
                    :disabled="isSubmittingManualEntry"
                    :manual-input="false"
                  />
                </div>

                <Button
                  type="button"
                  class="w-full lg:w-auto"
                  :disabled="isManualSubmitDisabled"
                  label="Add entry"
                  :loading="isSubmittingManualEntry"
                  @click="submitManualEntry"
                />
              </div>

              <div
                v-if="manualEntryErrorMessage"
                class="border-destructive/20 bg-destructive/5 rounded-lg border p-3"
              >
                <p class="text-destructive text-sm font-medium">
                  Manual entry needs attention.
                </p>
                <p class="text-destructive mt-1 text-xs">
                  {{ manualEntryErrorMessage }}
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  </section>
</template>
