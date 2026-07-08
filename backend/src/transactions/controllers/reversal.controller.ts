import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/users/entities/user.entity';
import { ReversalService } from '../services/reversal.service';

@ApiTags('Transactions — Reversal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
@Controller('transactions')
export class ReversalController {
  constructor(private readonly reversalService: ReversalService) {}

  /**
   * Reverses a completed transfer transaction.
   * Creates a new REVERSAL transaction rather than modifying the original record.
   * Restricted to admin roles only.
   */
  @Post(':id/reverse')
  @ApiOperation({ summary: 'Reverse a completed transfer transaction (Admin/Manager only)' })
  async reverseTransaction(@Param('id') transactionId: string) {
    return this.reversalService.reverseTransaction(transactionId);
  }
}
