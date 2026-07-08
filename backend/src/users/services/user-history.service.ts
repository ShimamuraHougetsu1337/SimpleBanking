import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserHistory } from '../entities/user-history.entity';

/**
 * INSERT-ONLY service for user versioning.
 * Records the old and new value of any sensitive user field change
 * before the update is applied.
 *
 * This service intentionally exposes NO update or delete methods.
 */
@Injectable()
export class UserHistoryService {
  constructor(
    @InjectRepository(UserHistory)
    private readonly repo: Repository<UserHistory>,
  ) {}

  /**
   * Records a single field change for a user.
   * Must be called with the OLD value BEFORE the update is saved.
   */
  async record(
    userId: string,
    changedById: string | null,
    changedField: string,
    oldValue: string | null,
    newValue: string | null,
  ): Promise<void> {
    const entry = this.repo.create({
      userId,
      changedById,
      changedField,
      oldValue,
      newValue,
    });
    await this.repo.save(entry);
  }

  /**
   * Returns the full change history for a given user, newest first.
   */
  async findByUserId(userId: string): Promise<UserHistory[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
