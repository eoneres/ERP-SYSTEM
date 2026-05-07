import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Lead, LeadStage } from '../entities/lead.entity';
import { Quote } from '../entities/quote.entity';
import { Interaction } from '../entities/interaction.entity';
import {
  CreateLeadDto, UpdateLeadDto, MoveLeadDto, ConvertLeadDto, LeadFilterDto,
  CreateQuoteDto, UpdateQuoteDto,
  CreateInteractionDto, UpdateInteractionDto,
} from '../dto/crm.dto';

// Cross-module via DataSource — sem circular dependency
import { Customer, CustomerType } from '@modules/sales/entities/customer.entity';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    @InjectRepository(Lead)        private readonly leadRepo:        Repository<Lead>,
    @InjectRepository(Quote)       private readonly quoteRepo:       Repository<Quote>,
    @InjectRepository(Interaction) private readonly interactionRepo: Repository<Interaction>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Leads ────────────────────────────────────────────────────────────────

  async getLeads(tenantId: string, filter: LeadFilterDto) {
    const { page, limit, search, stage, source, ownerId } = filter;
    const qb = this.leadRepo.createQueryBuilder('l')
      .where('l.tenantId = :tenantId', { tenantId })
      .andWhere('l.deletedAt IS NULL');

    if (search)  qb.andWhere('(l.name ILIKE :s OR l.email ILIKE :s OR l.company ILIKE :s)', { s: `%${search}%` });
    if (stage)   qb.andWhere('l.stage = :stage',   { stage });
    if (source)  qb.andWhere('l.source = :source', { source });
    if (ownerId) qb.andWhere('l.ownerId = :ownerId', { ownerId });

    qb.orderBy('l.kanbanOrder', 'ASC').addOrderBy('l.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /** Retorna leads agrupados por stage para o Kanban */
  async getKanban(tenantId: string) {
    const leads = await this.leadRepo.find({
      where: { tenantId },
      order: { kanbanOrder: 'ASC', createdAt: 'DESC' },
    });

    const stages = Object.values(LeadStage);
    return stages.reduce<Record<string, Lead[]>>((acc, s) => {
      acc[s] = leads.filter((l) => l.stage === s);
      return acc;
    }, {} as Record<string, Lead[]>);
  }

  async getLead(id: string, tenantId: string) {
    const lead = await this.leadRepo.findOne({ where: { id, tenantId } });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return lead;
  }

  async createLead(tenantId: string, userId: string, dto: CreateLeadDto) {
    if (dto.email) {
      const exists = await this.leadRepo.findOne({ where: { email: dto.email, tenantId } });
      if (exists) throw new BadRequestException(`E-mail '${dto.email}' já cadastrado como lead`);
    }
    return this.leadRepo.save(
      this.leadRepo.create({
        ...dto,
        tenantId,
        createdBy: userId,
        stage: dto.stage ?? LeadStage.NEW,
        probability: dto.probability ?? 0,
        kanbanOrder: await this.nextKanbanOrder(tenantId, dto.stage ?? LeadStage.NEW),
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
      }),
    );
  }

  async updateLead(id: string, tenantId: string, userId: string, dto: UpdateLeadDto) {
    const lead = await this.getLead(id, tenantId);
    Object.assign(lead, {
      ...dto,
      updatedBy: userId,
      expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : lead.expectedCloseDate,
    });
    return this.leadRepo.save(lead);
  }

  async moveLead(id: string, tenantId: string, userId: string, dto: MoveLeadDto) {
    const lead = await this.getLead(id, tenantId);
    if (lead.stage === LeadStage.CONVERTED) {
      throw new BadRequestException('Lead convertido não pode ser movido');
    }
    lead.stage       = dto.stage;
    lead.kanbanOrder = dto.kanbanOrder ?? await this.nextKanbanOrder(tenantId, dto.stage);
    lead.updatedBy   = userId;
    return this.leadRepo.save(lead);
  }

  /**
   * Converte lead → Customer (sales_customers).
   * Cria o Customer dentro de uma transação e marca o lead como CONVERTED.
   */
  async convertLead(id: string, tenantId: string, userId: string, dto: ConvertLeadDto) {
    const lead = await this.getLead(id, tenantId);

    if (lead.stage === LeadStage.CONVERTED) {
      throw new BadRequestException('Lead já foi convertido');
    }

    return this.dataSource.transaction(async (em) => {
      // Verifica duplicidade de e-mail no módulo de clientes
      if (lead.email) {
        const existing = await em.findOne(Customer, { where: { email: lead.email, tenantId } });
        if (existing) {
          // Apenas vincula sem criar duplicata
          lead.stage               = LeadStage.CONVERTED;
          lead.convertedCustomerId = existing.id;
          lead.convertedAt         = new Date();
          lead.updatedBy           = userId;
          await em.save(Lead, lead);
          return { lead, customer: existing, created: false };
        }
      }

      const customer = em.create(Customer, {
        tenantId,
        createdBy: userId,
        name:     dto.customerName ?? lead.name,
        email:    lead.email,
        phone:    lead.phone,
        type:     lead.company ? CustomerType.COMPANY : CustomerType.INDIVIDUAL,
        isActive: true,
        notes:    lead.notes,
      });
      const savedCustomer = await em.save(Customer, customer);

      lead.stage               = LeadStage.CONVERTED;
      lead.convertedCustomerId = savedCustomer.id;
      lead.convertedAt         = new Date();
      lead.updatedBy           = userId;
      await em.save(Lead, lead);

      this.logger.log(`Lead ${id} convertido → Customer ${savedCustomer.id} (tenant ${tenantId})`);
      return { lead, customer: savedCustomer, created: true };
    });
  }

  async deleteLead(id: string, tenantId: string) {
    const lead = await this.getLead(id, tenantId);
    if (lead.stage === LeadStage.CONVERTED) {
      throw new BadRequestException('Lead convertido não pode ser excluído');
    }
    await this.leadRepo.softRemove(lead);
  }

  // ─── Quotes ───────────────────────────────────────────────────────────────

  async getQuotes(tenantId: string, leadId: string) {
    return this.quoteRepo.find({
      where: { tenantId, leadId },
      order: { createdAt: 'DESC' },
    });
  }

  async createQuote(tenantId: string, userId: string, dto: CreateQuoteDto) {
    await this.getLead(dto.leadId, tenantId); // valida que o lead pertence ao tenant
    const quoteNumber = `COT-${Date.now().toString(36).toUpperCase()}`;
    return this.quoteRepo.save(
      this.quoteRepo.create({
        ...dto,
        tenantId,
        createdBy: userId,
        quoteNumber,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      }),
    );
  }

  async updateQuote(id: string, tenantId: string, userId: string, dto: UpdateQuoteDto) {
    const quote = await this.quoteRepo.findOne({ where: { id, tenantId } });
    if (!quote) throw new NotFoundException('Proposta não encontrada');
    Object.assign(quote, { ...dto, updatedBy: userId, validUntil: dto.validUntil ? new Date(dto.validUntil) : quote.validUntil });
    return this.quoteRepo.save(quote);
  }

  async deleteQuote(id: string, tenantId: string) {
    const quote = await this.quoteRepo.findOne({ where: { id, tenantId } });
    if (!quote) throw new NotFoundException('Proposta não encontrada');
    await this.quoteRepo.softRemove(quote);
  }

  // ─── Interactions ─────────────────────────────────────────────────────────

  async getInteractions(tenantId: string, leadId: string) {
    return this.interactionRepo.find({
      where: { tenantId, leadId },
      order: { interactionDate: 'DESC' },
    });
  }

  async createInteraction(tenantId: string, userId: string, dto: CreateInteractionDto) {
    await this.getLead(dto.leadId, tenantId);
    return this.interactionRepo.save(
      this.interactionRepo.create({
        ...dto,
        tenantId,
        createdBy: userId,
        interactionDate: dto.interactionDate ? new Date(dto.interactionDate) : new Date(),
        nextActionDate:  dto.nextActionDate  ? new Date(dto.nextActionDate)  : undefined,
      }),
    );
  }

  async updateInteraction(id: string, tenantId: string, userId: string, dto: UpdateInteractionDto) {
    const interaction = await this.interactionRepo.findOne({ where: { id, tenantId } });
    if (!interaction) throw new NotFoundException('Interação não encontrada');
    Object.assign(interaction, {
      ...dto,
      updatedBy: userId,
      interactionDate: dto.interactionDate ? new Date(dto.interactionDate) : interaction.interactionDate,
      nextActionDate:  dto.nextActionDate  ? new Date(dto.nextActionDate)  : interaction.nextActionDate,
    });
    return this.interactionRepo.save(interaction);
  }

  async deleteInteraction(id: string, tenantId: string) {
    const interaction = await this.interactionRepo.findOne({ where: { id, tenantId } });
    if (!interaction) throw new NotFoundException('Interação não encontrada');
    await this.interactionRepo.softRemove(interaction);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────

  async getSummary(tenantId: string) {
    const [total, byStage, totalValue] = await Promise.all([
      this.leadRepo.count({ where: { tenantId } }),
      this.leadRepo.createQueryBuilder('l')
        .select('l.stage', 'stage')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(l.estimatedValue)', 'value')
        .where('l.tenantId = :tenantId', { tenantId })
        .andWhere('l.deletedAt IS NULL')
        .groupBy('l.stage')
        .getRawMany(),
      this.leadRepo.createQueryBuilder('l')
        .select('SUM(l.estimatedValue)', 'total')
        .where('l.tenantId = :tenantId', { tenantId })
        .andWhere('l.deletedAt IS NULL')
        .andWhere('l.stage NOT IN (:...excluded)', { excluded: [LeadStage.LOST, LeadStage.CONVERTED] })
        .getRawOne(),
    ]);

    return {
      total,
      byStage: byStage.reduce<Record<string, { count: number; value: number }>>((acc, r) => {
        acc[r.stage] = { count: Number(r.count), value: Number(r.value ?? 0) };
        return acc;
      }, {}),
      pipelineValue: Number(totalValue?.total ?? 0),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async nextKanbanOrder(tenantId: string, stage: LeadStage): Promise<number> {
    const result = await this.leadRepo.createQueryBuilder('l')
      .select('MAX(l.kanbanOrder)', 'max')
      .where('l.tenantId = :tenantId AND l.stage = :stage', { tenantId, stage })
      .getRawOne();
    return (Number(result?.max ?? -1)) + 1;
  }
}
