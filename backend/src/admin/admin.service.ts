import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { UserStatus } from '@/users/entities/user.entity';

@Injectable()
export class AdminService {
  constructor(private readonly usersService: UsersService) { }

  async getUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: UserStatus,
  ) {
    const { data, total } = await this.usersService.findAll(page, limit, search, status);
    const totalUsers = await this.usersService.countAll();
    const activeAccounts = await this.usersService.countStatus(UserStatus.ACTIVE);
    const lockedAccounts = await this.usersService.countStatus(UserStatus.LOCKED);

    const formattedData = data.map((user) => {
      const account = user.accounts?.[0];
      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        accountNumber: account ? account.accountNumber : null,
        balance: account ? account.balance : '0.00',
        createdAt: user.createdAt,
      };
    });

    return {
      data: formattedData,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        totalUsers,
        activeAccounts,
        lockedAccounts,
      },
    };
  }

  async getUserById(id: string) {
    const user = await this.usersService.findById(id, { accounts: true });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    const account = user.accounts?.[0];
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      accountNumber: account ? account.accountNumber : null,
      balance: account ? account.balance : '0.00',
      createdAt: user.createdAt,
    };
  }

  async updateUserStatus(id: string, status: UserStatus, currentAdminId: string) {
    if (id === currentAdminId) {
      throw new BadRequestException('Administrators cannot lock their own accounts');
    }

    const updatedUser = await this.usersService.updateStatus(id, status);
    return {
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      createdAt: updatedUser.createdAt,
    };
  }
}

