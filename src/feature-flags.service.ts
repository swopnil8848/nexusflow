import { Injectable } from '@nestjs/common';

export interface FeatureFlagCheckInput {
  killSwitchEnabled: boolean;
  globalDefault: boolean;
  tenantOverrides: Record<string, boolean>;
  roleOverrides: Record<string, boolean>;
  planOverrides: Record<string, boolean>;
  tenantId: string;
  roleKeys: string[];
  planKey: string;
}

@Injectable()
export class FeatureFlagsService {
  isEnabled(input: FeatureFlagCheckInput): boolean {
    if (input.killSwitchEnabled) {
      return false;
    }

    const tenantOverride = input.tenantOverrides[input.tenantId];
    if (tenantOverride !== undefined) {
      return tenantOverride;
    }

    for (const roleKey of input.roleKeys) {
      const roleOverride = input.roleOverrides[roleKey];
      if (roleOverride !== undefined) {
        return roleOverride;
      }
    }

    const planOverride = input.planOverrides[input.planKey];
    if (planOverride !== undefined) {
      return planOverride;
    }

    return input.globalDefault;
  }
}
