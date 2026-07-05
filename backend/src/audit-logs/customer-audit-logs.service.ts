import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerAuditLog } from './entities/customer-audit-log.entity';
import { CreateCustomerAuditLogDto } from './dto/create-customer-audit-log.dto';
import { GetCustomerAuditLogsQueryDto } from './dto/get-customer-audit-logs-query.dto';

@Injectable()
export class CustomerAuditLogsService {
  private readonly logger = new Logger(CustomerAuditLogsService.name);

  constructor(
    @InjectRepository(CustomerAuditLog)
    private readonly repo: Repository<CustomerAuditLog>,
  ) {}

  async log(dto: CreateCustomerAuditLogDto): Promise<void> {
    try {
      await this.repo.save(this.repo.create(dto));
    } catch (err) {
      this.logger.error('Failed to write customer audit log', err);
    }
  }

  async findAll(params: GetCustomerAuditLogsQueryDto) {
    const { page = 1, limit = 20, action, status, startDate, endDate } = params;
    
    const queryBuilder = this.repo.createQueryBuilder('log')
      .leftJoinAndSelect('log.transaction', 'tx')
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
