import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DealDeletionRequestEntity, DealDeletionStatus } from '@orm/entities/deal-deletion-request.entity';

@Injectable()
export class DealDeletionRequestRepository extends Repository<DealDeletionRequestEntity> {
  constructor(private dataSource: DataSource) {
    super(DealDeletionRequestEntity, dataSource.createEntityManager());
  }

  async findById(id: number): Promise<DealDeletionRequestEntity | null> {
    return this.findOne({
      where: { id },
      relations: {
        deal: true,
        requester: true,
        processed_by: true
      }
    });
  }

  async findByDealId(dealId: number): Promise<DealDeletionRequestEntity[]> {
    return this.find({
      where: { deal_id: dealId },
      relations: {
        deal: true,
        requester: true,
        processed_by: true
      },
      order: { created_at: 'DESC' }
    });
  }

  async findPendingRequests(): Promise<DealDeletionRequestEntity[]> {
    return this.find({
      where: { status: DealDeletionStatus.PENDING },
      relations: {
        deal: true,
        requester: true
      },
      order: { created_at: 'ASC' }
    });
  }

  async findByRequesterId(requesterId: number): Promise<DealDeletionRequestEntity[]> {
    return this.find({
      where: { requester_id: requesterId },
      relations: {
        deal: true,
        processed_by: true
      },
      order: { created_at: 'DESC' }
    });
  }

  async hasPendingRequestForDeal(dealId: number): Promise<boolean> {
    const count = await this.count({
      where: {
        deal_id: dealId,
        status: DealDeletionStatus.PENDING
      }
    });
    return count > 0;
  }

  async findAllWithRelations(): Promise<DealDeletionRequestEntity[]> {
    return this.find({
      relations: {
        deal: true,
        requester: true,
        processed_by: true
      },
      order: { created_at: 'DESC' }
    });
  }
}