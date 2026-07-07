import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeeLedger, FeeLedgerType } from '../entities/fee-ledger.entity';

export interface FeeJobData {
  transactionId: string;
  amount: string;
  type?: FeeLedgerType;
}

@Injectable()
@Processor('fee_queue')
export class FeeQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(FeeQueueProcessor.name);

  constructor(
    @InjectRepository(FeeLedger)
    private readonly feeLedgerRepository: Repository<FeeLedger>,
  ) {
    super();
  }

  async process(job: Job<FeeJobData, void, string>): Promise<void> {
    const { transactionId, amount, type } = job.data;
    
    this.logger.log(`Processing fee record for transaction ${transactionId} with amount ${amount}`);

    const feeLedger = this.feeLedgerRepository.create({
      transactionId,
      amount,
      type: type || FeeLedgerType.CREDIT,
    });

    await this.feeLedgerRepository.save(feeLedger);
    this.logger.log(`Fee record saved successfully for transaction ${transactionId}`);
  }
}
