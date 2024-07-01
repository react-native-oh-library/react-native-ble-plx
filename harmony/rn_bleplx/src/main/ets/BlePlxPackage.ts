import { RNPackage, TurboModulesFactory } from '@rnoh/react-native-openharmony/ts';
import type { TurboModule, TurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import { BlePlxModule } from './BlePlxModule';

class BlePlxModulesFactory extends TurboModulesFactory {
  createTurboModule(name: string): TurboModule | null {
    if (name == 'BlePlx') {
      return new BlePlxModule(this.ctx);
    }
    return null;
  }

  hasTurboModule(name: string): boolean {
    return name == 'BlePlx';
  }
}

export class BlePlxPackage extends RNPackage {
  createTurboModulesFactory(ctx: TurboModuleContext): TurboModulesFactory {
    return new BlePlxModulesFactory(ctx);
  }
}