import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncContextService } from '../context/async-context.service';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private readonly asyncContextService: AsyncContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const headerId = req.headers['x-request-id'];
    const requestId = (Array.isArray(headerId) ? headerId[0] : headerId) || uuidv4();

    res.setHeader('X-Request-Id', requestId);

    this.asyncContextService.run({ requestId }, () => {
      next();
    });
  }
}
