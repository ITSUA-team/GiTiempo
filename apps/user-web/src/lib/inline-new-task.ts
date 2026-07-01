import { createTaskSchema } from "@gitiempo/shared";

export const INLINE_NEW_TASK_ID = "__inline-new-task__";
export const INLINE_NEW_TASK_TITLE = "New task" as const;

export interface InlineNewTaskOptionBase {
  id: typeof INLINE_NEW_TASK_ID;
  isNewTask: true;
  title: typeof INLINE_NEW_TASK_TITLE;
}

export type InlineNewTaskOption<TExtra extends object = Record<string, never>> =
  InlineNewTaskOptionBase & TExtra;

export function createInlineNewTaskOption<
  TExtra extends object = Record<string, never>,
>(extra?: TExtra): InlineNewTaskOption<TExtra> {
  return {
    ...(extra ?? ({} as TExtra)),
    id: INLINE_NEW_TASK_ID,
    isNewTask: true,
    title: INLINE_NEW_TASK_TITLE,
  };
}

export function isInlineNewTaskId(
  value: string | null | undefined,
): value is typeof INLINE_NEW_TASK_ID {
  return value === INLINE_NEW_TASK_ID;
}

export function isInlineNewTaskOption(
  value: unknown,
): value is InlineNewTaskOption {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<InlineNewTaskOption>;

  return (
    candidate.id === INLINE_NEW_TASK_ID &&
    candidate.isNewTask === true &&
    candidate.title === INLINE_NEW_TASK_TITLE
  );
}

export function validateInlineNewTaskInput(options: {
  defaultBillableForTimeEntries: boolean;
  title: string;
}) {
  return createTaskSchema.safeParse({
    defaultBillableForTimeEntries: options.defaultBillableForTimeEntries,
    title: options.title.trim(),
  });
}
