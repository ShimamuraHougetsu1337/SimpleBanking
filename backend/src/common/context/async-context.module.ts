import { Global, Module } from '@nestjs/common';
import { AsyncContextService } from './async-context.service';
import { JsonLogger } from '../logger/json.logger';

@Global()
@Module({
  providers: [AsyncContextService, JsonLogger],
  exports: [AsyncContextService, JsonLogger],
})
export class AsyncContextModule {}
