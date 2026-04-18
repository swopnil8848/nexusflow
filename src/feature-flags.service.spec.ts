import { FeatureFlagsService } from './feature-flags.service';

describe('FeatureFlagsService', () => {
  const service = new FeatureFlagsService();

  it('returns false when kill switch is enabled', () => {
    const result = service.isEnabled({
      killSwitchEnabled: true,
      globalDefault: true,
      tenantOverrides: { 'tenant-1': true },
      roleOverrides: { admin: true },
      planOverrides: { pro: true },
      tenantId: 'tenant-1',
      roleKeys: ['admin'],
      planKey: 'pro',
    });

    expect(result).toBe(false);
  });

  it('uses tenant override first', () => {
    const result = service.isEnabled({
      killSwitchEnabled: false,
      globalDefault: false,
      tenantOverrides: { 'tenant-1': true },
      roleOverrides: { admin: false },
      planOverrides: { pro: false },
      tenantId: 'tenant-1',
      roleKeys: ['admin'],
      planKey: 'pro',
    });

    expect(result).toBe(true);
  });

  it('uses role override when tenant override does not exist', () => {
    const result = service.isEnabled({
      killSwitchEnabled: false,
      globalDefault: false,
      tenantOverrides: {},
      roleOverrides: { manager: true },
      planOverrides: { pro: false },
      tenantId: 'tenant-1',
      roleKeys: ['member', 'manager'],
      planKey: 'pro',
    });

    expect(result).toBe(true);
  });

  it('uses plan override when tenant and role overrides do not exist', () => {
    const result = service.isEnabled({
      killSwitchEnabled: false,
      globalDefault: false,
      tenantOverrides: {},
      roleOverrides: {},
      planOverrides: { pro: true },
      tenantId: 'tenant-1',
      roleKeys: ['member'],
      planKey: 'pro',
    });

    expect(result).toBe(true);
  });

  it('falls back to global default', () => {
    const result = service.isEnabled({
      killSwitchEnabled: false,
      globalDefault: true,
      tenantOverrides: {},
      roleOverrides: {},
      planOverrides: {},
      tenantId: 'tenant-1',
      roleKeys: ['member'],
      planKey: 'free',
    });

    expect(result).toBe(true);
  });
});
