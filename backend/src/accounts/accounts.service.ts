import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, AccountStatus } from './entities/account.entity';
import { User } from '@/users/entities/user.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  async createDefaultAccount(user: User): Promise<Account> {
    const timestamp = Date.now().toString().slice(-10);
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    const accountNumber = `VN${timestamp}${random}`;

    const account = this.accountRepository.create({
      userId: user.id,
      accountNumber,
      name: accountNumber,
      balance: '0.00',
      currency: 'VND',
      status: AccountStatus.ACTIVE,
    });

    return this.accountRepository.save(account);
  }

  async findByUserId(userId: string): Promise<Account[]> {
    return this.accountRepository.find({
      where: { userId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findById(id: string, userId: string): Promise<Account | null> {
    return this.accountRepository.findOne({
      where: { id, userId },
      relations: { user: true },
    });
  }
}
