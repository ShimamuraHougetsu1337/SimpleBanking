import { ConsoleLogger, Injectable } from '@nestjs/common';
import { AsyncContextService } from '../context/async-context.service';

@Injectable()
export class JsonLogger extends ConsoleLogger {
  constructor(
    context: string,
    private readonly asyncContextService: AsyncContextService,
  ) {
    super(context);
  }

  private serializeLog(level: string, message: any, context?: string, trace?: string) {
    const requestId = this.asyncContextService?.getRequestId() || null;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: context || this.context,
      requestId,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      ...(trace ? { trace } : {}),
    };

    return JSON.stringify(logEntry);
  }

  log(message: any, context?: string) {
    console.log(this.serializeLog('log', message, context));
  }

  error(message: any, trace?: string, context?: string) {
    console.error(this.serializeLog('error', message, context, trace));
  }

  warn(message: any, context?: string) {
    console.warn(this.serializeLog('warn', message, context));
  }

  debug(message: any, context?: string) {
    console.debug(this.serializeLog('debug', message, context));
  }

  verbose(message: any, context?: string) {
    console.log(this.serializeLog('verbose', message, context));
  }
}
