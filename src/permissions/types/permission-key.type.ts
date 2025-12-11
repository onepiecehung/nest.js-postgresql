/**
 * PermissionKey type definition
 * Format: {component}.{action}
 * Examples: "article.create", "series.read", "organization.update"
 */

/**
 * Valid permission components
 */
export type PermissionComponent =
  | 'article'
  | 'series'
  | 'segment'
  | 'organization'
  | 'team'
  | 'project'
  | 'media'
  | 'sticker'
  | 'report';

/**
 * Valid permission actions
 */
export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

/**
 * PermissionKey type - structured permission identifier
 * Format: "{component}.{action}"
 */
export type PermissionKey = `${PermissionComponent}.${PermissionAction}`;

/**
 * Type guard to check if a string is a valid PermissionKey
 */
export function isPermissionKey(value: string): value is PermissionKey {
  const parts = value.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const [component, action] = parts;
  const validComponents: PermissionComponent[] = [
    'article',
    'series',
    'segment',
    'organization',
    'team',
    'project',
    'media',
    'sticker',
    'report',
  ];
  const validActions: PermissionAction[] = [
    'create',
    'read',
    'update',
    'delete',
  ];

  return (
    validComponents.includes(component as PermissionComponent) &&
    validActions.includes(action as PermissionAction)
  );
}

/**
 * Extract component from PermissionKey
 */
export function getComponent(key: PermissionKey): PermissionComponent {
  return key.split('.')[0] as PermissionComponent;
}

/**
 * Extract action from PermissionKey
 */
export function getAction(key: PermissionKey): PermissionAction {
  return key.split('.')[1] as PermissionAction;
}
