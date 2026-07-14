import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import type { Response } from 'express';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Check system health' })
  @ApiResponse({ status: 200, description: 'System is healthy' })
  @ApiResponse({ status: 503, description: 'System is unavailable' })
  async checkHealth(@Res() res: Response) {
    const startTime = Date.now();
    try {
      // Execute a simple query to verify database connectivity
      await this.dataSource.query('SELECT 1');
      const responseTimeMs = Date.now() - startTime;

      return res.status(HttpStatus.OK).json({
        status: 'ok',
        db: 'up',
        responseTime: `${responseTimeMs}ms`,
      });
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        db: 'down',
        error: error instanceof Error ? error.message : String(error),
        responseTime: `${responseTimeMs}ms`,
      });
    }
  }
}
