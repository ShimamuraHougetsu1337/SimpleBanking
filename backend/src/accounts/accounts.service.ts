import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, AccountStatus } from './entities/account.entity';
import { User } from '@/users/entities/user.entity';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) { }

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
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  async findByAccountNumber(accountNumber: string): Promise<Account | null> {
    return this.accountRepository.findOne({
      where: { accountNumber },
      relations: { user: true },
    });
  }

  async findById(id: string, userId: string): Promise<Account | null> {
    return this.accountRepository.findOne({
      where: { id, userId },
      relations: { user: true },
    });
  }

  async updateAccount(
    id: string,
    userId: string,
    updateData: { name?: string; theme?: string },
  ): Promise<Account> {
    const account = await this.findById(id, userId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    Object.assign(account, updateData);
    return this.accountRepository.save(account);
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, status?: AccountStatus) {
    const query = this.accountRepository.createQueryBuilder('account')
      .leftJoinAndSelect('account.user', 'user')
      .orderBy('account.createdAt', 'DESC');

    if (search) {
      query.andWhere(
        '(account.accountNumber ILIKE :search OR user.fullName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (status) {
      query.andWhere('account.status = :status', { status });
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async countAll(): Promise<number> {
    return this.accountRepository.count();
  }

  async updateStatus(id: string, status: AccountStatus): Promise<Account> {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Account with ID "${id}" not found`);
    }
    account.status = status;
    return this.accountRepository.save(account);
  }

  async createAccount(user: User, createAccountDto: CreateAccountDto): Promise<Account> {
    const timestamp = Date.now().toString().slice(-10);
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    const accountNumber = `VN${timestamp}${random}`;

    const account = this.accountRepository.create({
      userId: user.id,
      accountNumber,
      name: createAccountDto.name,
      theme: createAccountDto.theme || 'linear-gradient(135deg, #111827 0%, #000000 100%)',
      balance: '0.00',
      currency: 'VND',
      status: AccountStatus.ACTIVE,
    });

    return this.accountRepository.save(account);
  }
}
