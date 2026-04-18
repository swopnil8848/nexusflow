import {
  FeatureFlagContext,
  FeatureFlagDefinition,
  evaluateFeatureFlag,
} from '../domain/feature-flag-evaluator';

describe('FeatureFlagEvaluator', () => {
  const baseDefinition: FeatureFlagDefinition = {
    key: 'workflow.case_management',
    globalDefault: false,
    killSwitchEnabled: false,
    planOverrides: {},
    tenantOverrides: {},
    roleOverrides: {},
  };

  const baseContext: FeatureFlagContext = {
    tenantId: 'tenant-1',
    roleKeys: ['member'],
    planKey: 'free',
  };

  it('returns false when kill switch is enabled', () => {
    const definition: FeatureFlagDefinition = {
      ...baseDefinition,
      globalDefault: true,
      killSwitchEnabled: true,
      planOverrides: { enterprise: true },
      tenantOverrides: { 'tenant-1': true },
      roleOverrides: { admin: true },
    };

    expect(evaluateFeatureFlag(definition, baseContext)).toBe(false);
  });

  it('uses tenant override over all other enablement rules', () => {
    const definition: FeatureFlagDefinition = {
      ...baseDefinition,
      globalDefault: false,
      planOverrides: { enterprise: true },
      tenantOverrides: { 'tenant-1': false },
      roleOverrides: { admin: true },
    };

    const context: FeatureFlagContext = {
      ...baseContext,
      roleKeys: ['admin'],
      planKey: 'enterprise',
    };

    expect(evaluateFeatureFlag(definition, context)).toBe(false);
  });

  it('enables a flag from a role override when tenant override is missing', () => {
    const definition: FeatureFlagDefinition = {
      ...baseDefinition,
      roleOverrides: { manager: true },
    };

    const context: FeatureFlagContext = {
      ...baseContext,
      roleKeys: ['member', 'manager'],
    };

    expect(evaluateFeatureFlag(definition, context)).toBe(true);
  });

  it('falls back to plan override when tenant and role overrides are missing', () => {
    const definition: FeatureFlagDefinition = {
      ...baseDefinition,
      planOverrides: { pro: true },
    };

    const context: FeatureFlagContext = {
      ...baseContext,
      roleKeys: ['member'],
      planKey: 'pro',
    };

    expect(evaluateFeatureFlag(definition, context)).toBe(true);
  });

  it('falls back to global default when no override exists', () => {
    expect(evaluateFeatureFlag(baseDefinition, baseContext)).toBe(false);
  });
});
