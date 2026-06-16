type RegistrationErrorCode =
  | 'duplicate_email'
  | 'invalid_workspace_name'
  | 'rate_limited'
  | 'registration_service_unavailable'
  | 'weak_password'
  | 'workspace_name_unavailable';

export const REGISTRATION_ERROR_MESSAGES: Record<
  RegistrationErrorCode,
  string
> = {
  duplicate_email: 'An account already exists for that email.',
  invalid_workspace_name: 'Enter a valid workspace name.',
  rate_limited: 'Too many registration attempts. Please try again later.',
  registration_service_unavailable:
    'Registration is temporarily unavailable. Please try again later.',
  weak_password: 'Choose a stronger password and try again.',
  workspace_name_unavailable: 'That workspace name is already in use.',
};

type RegistrationValidationCode = Extract<
  RegistrationErrorCode,
  'invalid_workspace_name' | 'weak_password'
>;

interface ValidationIssueLike {
  path: (string | number)[];
}

export function getRegistrationValidationCode(
  issues: ValidationIssueLike[],
): RegistrationValidationCode | null {
  const issuePaths = issues.map((issue) => issue.path[0]);

  if (
    issuePaths.length > 0 &&
    issuePaths.every((path) => path === 'password')
  ) {
    return 'weak_password';
  }

  if (
    issuePaths.length > 0 &&
    issuePaths.every((path) => path === 'workspaceName')
  ) {
    return 'invalid_workspace_name';
  }

  return null;
}
