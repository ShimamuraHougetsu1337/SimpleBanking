import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { CreateAdminAuditLogDto } from './dto/create-admin-audit-log.dto';
import { GetAdminAuditLogsQueryDto } from './dto/get-admin-audit-logs-query.dto';

@Injectable()
export class AdminAuditLogsService {
  private readonly logger = new Logger(AdminAuditLogsService.name);

  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly repo: Repository<AdminAuditLog>,
  ) {}

  async log(dto: CreateAdminAuditLogDto): Promise<void> {
    try {
      await this.repo.save(this.repo.create(dto));
    } catch (err) {
      this.logger.error('Failed to write admin audit log', err);
    }
  }

  async findAll(params: GetAdminAuditLogsQueryDto) {
    const { page = 1, limit = 20, action, status, startDate, endDate } = params;
    
    const queryBuilder = this.repo.createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }
    if (status) {
      queryBuilder.andWhere('log.status = :status', { status });
    }
    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteOlderThan(days: number): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .where('created_at < NOW() - INTERVAL \'' + days + ' days\'')
      .execute();
    return result.affected ?? 0;
  }
}
