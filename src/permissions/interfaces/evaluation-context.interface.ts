/**
 * Context for permission evaluation
 * Contains information about the user and scope being evaluated
 */
export interface EvaluationContext {
  /**
   * User ID to evaluate permissions for
   */
  userId: string;

  /**
   * Type of scope (e.g., 'organization', 'team', 'project')
   * If not provided, evaluation is done at global level
   */
  scopeType?: string;

  /**
   * ID of the scope resource
   * If not provided, evaluation is done at global level
   */
  scopeId?: string;
}

/**
 * Result of permission evaluation
 */
export interface EvaluationResult {
  /**
   * Whether the permission is allowed
   */
  allowed: boolean;

  /**
   * Which level granted/denied the permission
   * 'scope' | 'role' | 'user' | 'default'
   */
  level: 'scope' | 'role' | 'user' | 'default';

  /**
   * Whether the permission was explicitly denied
   */
  denied: boolean;

  /**
   * Reason for the decision (for debugging)
   */
  reason?: string;
}
