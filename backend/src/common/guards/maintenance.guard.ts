import { Injectable, CanActivate, ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Request } from 'express';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const url = request.originalUrl || request.url || '';

    // Allow admin and auth routes to bypass maintenance mode
    // Matches patterns like: /api/v1/auth/login, /api/auth/login, /v1/auth/login, /auth/login, /api/v1/admin/...
    const bypassRegex = /^\/?(api\/)?(v\d+\/)?(auth|admin)\b/i;
    if (bypassRegex.test(url)) {
      return true;
    }

    try {
      const result: Array<{ setting_value: string, data_type: string }> = await this.dataSource.query(
        `SELECT setting_value, data_type FROM system_settings WHERE setting_key = 'maintenance_mode'`
      );

      if (result && result.length > 0) {
        const { setting_value, data_type } = result[0];
        const isMaintenance = data_type === 'boolean' ? setting_value === 'true' : false;

        if (isMaintenance) {
          throw new ServiceUnavailableException('System is currently under maintenance. Please try again later.');
        }
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      // If DB error (e.g. table doesn't exist yet during initial setup), just allow
      console.error('MaintenanceGuard error:', error);
    }

    return true;
  }
}
