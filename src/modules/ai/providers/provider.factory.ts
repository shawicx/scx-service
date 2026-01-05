import { Provider } from '@nestjs/common';

export const PROVIDER_FACTORY = 'PROVIDER_FACTORY';

export const providerFactory: Provider = {
  provide: PROVIDER_FACTORY,
  useFactory: () => {
    // TODO: 将在 Phase 2 实现具体的 Provider 工厂
    return new Map();
  },
};
