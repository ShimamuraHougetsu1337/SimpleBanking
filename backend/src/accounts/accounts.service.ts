import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, AccountStatus } from './entities/account.entity';
import { User } from '@/users/entities/user.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { SystemAccount } from '@/common/enums/system-account.enum';

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

  async findByIdAdmin(id: string): Promise<Account | null> {
    return this.accountRepository.findOne({
      where: { id },
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

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: AccountStatus,
    type: 'customer' | 'system' | 'all' = 'customer',
  ) {
    const query = this.accountRepository.createQueryBuilder('account')
      .leftJoinAndSelect('account.user', 'user')
      .orderBy('account.createdAt', 'DESC');

    if (type === 'system') {
      query.andWhere('account.accountNumber LIKE :sysPrefix', { sysPrefix: 'SYS_%' });
    } else if (type === 'customer') {
      query.andWhere('account.accountNumber NOT LIKE :sysPrefix', { sysPrefix: 'SYS_%' });
    }

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

    const isSystemAccount =
      account.accountNumber === (SystemAccount.FEE_SUSPENSE as string) ||
      account.accountNumber === (SystemAccount.REVENUE as string);

    if (isSystemAccount) {
      throw new BadRequestException('Không được phép khóa hoặc thay đổi trạng thái của tài khoản hệ thống');
    }

    account.status = status;
    return this.accountRepository.save(account);
  }

  /**
   * Soft-deletes an account by setting deleted_at.
   * The record is preserved in the database for regulatory compliance.
   * All existing transactions and ledger entries remain intact.
   */
  async softDelete(id: string): Promise<void> {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Account with ID "${id}" not found`);
    }

    const isSystemAccount =
      account.accountNumber === (SystemAccount.FEE_SUSPENSE as string) ||
      account.accountNumber === (SystemAccount.REVENUE as string);

    if (isSystemAccount) {
      throw new BadRequestException('Không được phép xóa tài khoản hệ thống');
    }

    await this.accountRepository.softDelete(id);
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
