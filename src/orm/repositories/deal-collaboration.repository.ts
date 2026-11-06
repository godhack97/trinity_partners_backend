import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DealChannelEntity,
  DealChannelReadEntity,
  DealChannelType,
  DealManagerTransferEntity,
  DealMessageEntity,
  DealParticipantEntity,
  DealParticipantParty,
} from "@orm/entities";
import { EntityManager, IsNull, Repository } from "typeorm";

@Injectable()
export class DealCollaborationRepository {
  constructor(
    @InjectRepository(DealParticipantEntity)
    private readonly participants: Repository<DealParticipantEntity>,
    @InjectRepository(DealChannelEntity)
    private readonly channels: Repository<DealChannelEntity>,
    @InjectRepository(DealMessageEntity)
    private readonly messages: Repository<DealMessageEntity>,
    @InjectRepository(DealChannelReadEntity)
    private readonly reads: Repository<DealChannelReadEntity>,
    @InjectRepository(DealManagerTransferEntity)
    private readonly transfers: Repository<DealManagerTransferEntity>,
  ) {}

  async findActiveParticipant(dealId: number, userId: number) {
    return this.participants.findOne({
      where: { deal_id: dealId, user_id: userId, is_active: true },
      relations: ["user", "user.user_info", "company"],
    });
  }

  async listParticipants(dealId: number) {
    return this.participants.find({
      where: { deal_id: dealId, is_active: true },
      relations: ["user", "user.user_info", "company"],
      order: { created_at: "ASC" },
    });
  }

  async addParticipant(input: {
    dealId: number;
    userId: number;
    companyId: number;
    partyType: DealParticipantParty;
    addedBy: number;
    participantRole?: string | null;
  }) {
    await this.participants.upsert(
      {
        deal_id: input.dealId,
        user_id: input.userId,
        company_id: input.companyId,
        party_type: input.partyType,
        participant_role: input.participantRole || null,
        added_by: input.addedBy,
        removed_at: null,
        removed_by: null,
        is_active: true,
      },
      ["deal_id", "user_id"],
    );
    return this.participants.findOneByOrFail({
      deal_id: input.dealId,
      user_id: input.userId,
    });
  }

  async removeParticipant(dealId: number, userId: number, removedBy: number) {
    return this.participants.update(
      { deal_id: dealId, user_id: userId, is_active: true },
      { is_active: false, removed_at: new Date(), removed_by: removedBy },
    );
  }

  async archiveDistributorParticipants(
    dealId: number,
    companyId: number,
    removedBy: number,
  ) {
    return this.participants.update(
      {
        deal_id: dealId,
        company_id: companyId,
        party_type: DealParticipantParty.Distributor,
        is_active: true,
      },
      { is_active: false, removed_at: new Date(), removed_by: removedBy },
    );
  }

  async ensureChannel(
    dealId: number,
    channelType: DealChannelType,
    firstCompanyId?: number | null,
    secondCompanyId?: number | null,
  ) {
    const existing = await this.channels.findOneBy({
      deal_id: dealId,
      channel_type: channelType,
      first_company_id: firstCompanyId ?? IsNull(),
      second_company_id: secondCompanyId ?? IsNull(),
      archived_at: IsNull(),
    });
    if (existing) return existing;

    return this.channels.save(
      this.channels.create({
        deal_id: dealId,
        channel_type: channelType,
        first_company_id: firstCompanyId || null,
        second_company_id: secondCompanyId || null,
      }),
    );
  }

  async listActiveChannels(dealId: number) {
    return this.channels.find({
      where: { deal_id: dealId, archived_at: IsNull() },
      order: { created_at: "ASC" },
    });
  }

  async findActiveChannel(dealId: number, channelId: number) {
    return this.channels.findOneBy({
      id: channelId,
      deal_id: dealId,
      archived_at: IsNull(),
    });
  }

  async archiveDistributorChannels(dealId: number, companyId: number) {
    return this.channels
      .createQueryBuilder()
      .update()
      .set({ archived_at: new Date() })
      .where("deal_id = :dealId", { dealId })
      .andWhere("archived_at IS NULL")
      .andWhere(
        "channel_type IN (:...types)",
        {
          types: [
            DealChannelType.VendorDistributor,
            DealChannelType.PartnerDistributor,
          ],
        },
      )
      .andWhere("(first_company_id = :companyId OR second_company_id = :companyId)", {
        companyId,
      })
      .execute();
  }

  async listMessages(channelId: number) {
    return this.messages.find({
      where: { channel_id: channelId },
      relations: ["author", "author.user_info"],
      order: { created_at: "ASC" },
    });
  }

  async getUnreadCount(channelId: number, userId: number) {
    const row = await this.messages
      .createQueryBuilder("message")
      .leftJoin(
        DealChannelReadEntity,
        "read_state",
        "read_state.channel_id = message.channel_id AND read_state.user_id = :userId",
        { userId },
      )
      .select("COUNT(message.id)", "count")
      .where("message.channel_id = :channelId", { channelId })
      .andWhere("message.deleted_at IS NULL")
      .andWhere("message.author_id != :userId", { userId })
      .andWhere("message.id > COALESCE(read_state.last_read_message_id, 0)")
      .getRawOne<{ count: string }>();
    return Number(row?.count || 0);
  }

  async addMessage(input: {
    channelId: number;
    authorId: number;
    authorCompanyId?: number | null;
    text: string;
    attachments?: unknown[];
  }) {
    return this.messages.save(
      this.messages.create({
        channel_id: input.channelId,
        author_id: input.authorId,
        author_company_id: input.authorCompanyId || null,
        text: input.text,
        attachments: input.attachments || null,
      }),
    );
  }

  async markRead(channelId: number, userId: number, messageId?: number | null) {
    await this.reads.upsert(
      {
        channel_id: channelId,
        user_id: userId,
        last_read_message_id: messageId || null,
        last_read_at: new Date(),
      },
      ["channel_id", "user_id"],
    );
  }

  async transferManager(input: {
    dealId: number;
    expectedManagerId?: number | null;
    newManagerId: number;
    transferredBy: number;
    reason?: string | null;
  }) {
    return this.participants.manager.transaction(async (manager: EntityManager) => {
      const result = await manager
        .createQueryBuilder()
        .update("deals")
        .set({ responsible_manager_id: input.newManagerId })
        .where("id = :dealId", { dealId: input.dealId })
        .andWhere(
          input.expectedManagerId == null
            ? "responsible_manager_id IS NULL"
            : "responsible_manager_id = :expectedManagerId",
          input.expectedManagerId == null
            ? {}
            : { expectedManagerId: input.expectedManagerId },
        )
        .execute();
      if (!result.affected) return false;

      await manager.getRepository(DealManagerTransferEntity).save({
        deal_id: input.dealId,
        previous_manager_id: input.expectedManagerId || null,
        new_manager_id: input.newManagerId,
        transferred_by: input.transferredBy,
        reason: input.reason || null,
      });
      return true;
    });
  }
}
