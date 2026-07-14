import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface AsyncContext {
  requestId: string;
}

@Injectable()
export class AsyncContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<AsyncContext>();

  run<T>(context: AsyncContext, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  getStore(): AsyncContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  getRequestId(): string | undefined {
    return this.getStore()?.requestId;
  }
}
