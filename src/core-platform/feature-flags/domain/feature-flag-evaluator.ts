export interface FeatureFlagDefinition {
  key: string;
  globalDefault: boolean;
  killSwitchEnabled: boolean;
  tenantOverrides: Record<string, boolean>;
  roleOverrides: Record<string, boolean>;
  planOverrides: Record<string, boolean>;
}

export interface FeatureFlagContext {
  tenantId: string;
  roleKeys: string[];
  planKey: string;
}

export function evaluateFeatureFlag(
  definition: FeatureFlagDefinition,
  context: FeatureFlagContext,
): boolean {
  if (definition.killSwitchEnabled) {
    return false;
  }

  const tenantOverride = definition.tenantOverrides[context.tenantId];
  if (tenantOverride !== undefined) {
    return tenantOverride;
  }

  for (const roleKey of context.roleKeys) {
    const roleOverride = definition.roleOverrides[roleKey];
    if (roleOverride !== undefined) {
      return roleOverride;
    }
  }

  const planOverride = definition.planOverrides[context.planKey];
  if (planOverride !== undefined) {
    return planOverride;
  }

  return definition.globalDefault;
}
