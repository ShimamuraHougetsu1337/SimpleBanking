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
import { User } from '@/users/entities/user.entity';

@Injectable()
export class TransactionRateLimitGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken()) options: ThrottlerModuleOptions,
    @Inject(getStorageToken()) storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly customerAuditLogsService: CustomerAuditLogsService,
  ) {
    super(options, storageService, reflector);
  }

  /**
   * Only run checks against the 'transactions' throttler configuration.
   */
  protected override async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    if (requestProps.throttler.name !== 'transactions') {
      return true;
    }
    return super.handleRequest(requestProps);
  }

  /**
   * Use the authenticated user's ID as the tracker key.
   * Falls back to client IP if the request is not authenticated.
   */
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request;
    const user = request.user as User | undefined;
    const ip = this.extractIp(request);
    return Promise.resolve(user?.id ?? ip);
  }

  /**
   * Called by ThrottlerGuard when a transaction request exceeds the rate limit.
   */
  protected override throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const ip = this.extractIp(req);
    const user = req.user as User | undefined;
    const retryAfter = throttlerLimitDetail.timeToBlockExpire || throttlerLimitDetail.timeToExpire;

    // Write audit log entry for security and rate-limiting visibility
    void this.customerAuditLogsService.log({
      customerId: user?.id ?? null,
      customerName: user?.fullName ?? null,
      customerEmail: user?.email ?? null,
      action: CustomerAuditAction.TRANSACTION_RATE_LIMITED,
      status: AuditStatus.FAILED,
      transactionId: null,
      metadata: {
        event: CustomerAuditAction.TRANSACTION_RATE_LIMITED,
        rateLimitKey: throttlerLimitDetail.tracker,
        ip,
        totalHits: throttlerLimitDetail.totalHits,
        limit: throttlerLimitDetail.limit,
        retryAfterSeconds: retryAfter,
        timestamp: new Date().toISOString(),
      },
      ipAddress: ip,
    });

    res.setHeader('Retry-After', String(retryAfter));

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Bạn đã thực hiện giao dịch quá nhanh và nhiều lần. Vui lòng thử lại sau ${retryAfter} giây.`,
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
