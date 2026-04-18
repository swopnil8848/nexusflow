import { Injectable } from '@nestjs/common';
import {
  FeatureFlagContext,
  FeatureFlagDefinition,
  evaluateFeatureFlag,
} from '../domain/feature-flag-evaluator';

@Injectable()
export class FeatureFlagService {
  isEnabled(
    definition: FeatureFlagDefinition,
    context: FeatureFlagContext,
  ): boolean {
    return evaluateFeatureFlag(definition, context);
  }
}
