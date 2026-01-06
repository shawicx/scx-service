import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAiProvider, AiProviderType } from '../interfaces/ai-provider.interface';
import { CopilotProvider } from './copilot.provider';
import { GlmProvider } from './glm.provider';
import { QwenProvider } from './qwen.provider';

export const PROVIDER_FACTORY = 'PROVIDER_FACTORY';

export const providerFactory: Provider = {
  provide: PROVIDER_FACTORY,
  useFactory: (configService: ConfigService) => {
    const providers = new Map<AiProviderType, IAiProvider>();

    providers.set('copilot', new CopilotProvider(configService));
    providers.set('glm', new GlmProvider(configService));
    providers.set('qwen', new QwenProvider(configService));

    return providers;
  },
  inject: [ConfigService],
};
