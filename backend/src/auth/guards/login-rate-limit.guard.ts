import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, getOptionsToken, getStorageToken } from '@nestjs/throttler';
import type { ThrottlerModuleOptions, ThrottlerStorage, ThrottlerRequest } from '@nestjs/throttler';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CustomerAuditLogsService } from '@/audit-logs/customer-audit-logs.service';
import { CustomerAuditAction } from '@/audit-logs/enums/customer-audit-action.enum';
import { AuditStatus } from '@/audit-logs/enums/audit-status.enum';

@Injectable()
export class LoginRateLimitGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken()) options: ThrottlerModuleOptions,
    @Inject(getStorageToken()) storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly customerAuditLogsService: CustomerAuditLogsService,
  ) {
    super(options, storageService, reflector);
  }

  /**
   * Only run checks against the 'login' throttler configuration.
   */
  protected override async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    if (requestProps.throttler.name !== 'login') {
      return true;
    }
    return super.handleRequest(requestProps);
  }

  /**
   * Use email as the rate limit tracker key.
   * Falls back to IP if no email is present in the request body.
   *
   * To switch back to IP-only rate limiting, replace the return statement with:
   *   return Promise.resolve(this.extractIp(req as unknown as Request));
   */
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const email = (req['body'] as Record<string, unknown>)?.['email'] as string | undefined;
    // return Promise.resolve(this.extractIp(req as unknown as Request)); // ← IP-only
    return Promise.resolve(email ?? this.extractIp(req as unknown as Request));
  }

  /**
   * Called by ThrottlerGuard when a request exceeds the limit.
   * We override this to:
   *  1. Write a `login_rate_limited` audit log entry.
   *  2. Set the Retry-After response header.
   *  3. Throw a structured HTTP 429 with a Vietnamese user message.
   */
  protected override throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const ip = this.extractIp(req);
    const attemptedEmail = (req.body as Record<string, unknown>)?.['email'] as string | undefined;
    const retryAfter = throttlerLimitDetail.timeToBlockExpire || throttlerLimitDetail.timeToExpire;

    // Write audit log — fire and forget
    void this.customerAuditLogsService.log({
      customerId: null,
      customerName: null,
      customerEmail: attemptedEmail ?? null,
      action: CustomerAuditAction.LOGIN_RATE_LIMITED,
      status: AuditStatus.FAILED,
      transactionId: null,
      entity: 'user',
      entityId: null,
      beforeData: {},
      afterData: {
        rateLimitKey: throttlerLimitDetail.tracker,
        attemptedEmail: attemptedEmail ?? null,
        totalHits: throttlerLimitDetail.totalHits,
        limit: throttlerLimitDetail.limit,
        retryAfterSeconds: retryAfter,
      },
      ipAddress: ip,
    });

    res.setHeader('Retry-After', String(retryAfter));

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ${retryAfter} giây.`,
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return first.trim();
    }
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  }
}
