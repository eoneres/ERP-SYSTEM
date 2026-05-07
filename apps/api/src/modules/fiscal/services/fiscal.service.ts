import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { InvoiceSeries, DocumentType } from '../entities/invoice-series.entity';
import { FiscalDocument, FiscalDocumentStatus } from '../entities/fiscal-document.entity';
import {
  CreateInvoiceSeriesDto, UpdateInvoiceSeriesDto,
  IssueFiscalDocumentDto, FiscalDocumentFilterDto,
} from '../dto/fiscal.dto';

// Cross-module via DataSource
import { Order } from '@modules/sales/entities/order.entity';

@Injectable()
export class FiscalService {
  private readonly logger = new Logger(FiscalService.name);

  constructor(
    @InjectRepository(InvoiceSeries)  private readonly seriesRepo: Repository<InvoiceSeries>,
    @InjectRepository(FiscalDocument) private readonly docRepo:    Repository<FiscalDocument>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Series ───────────────────────────────────────────────────────────────

  async getSeries(tenantId: string) {
    return this.seriesRepo.find({ where: { tenantId }, order: { series: 'ASC' } });
  }

  async createSeries(tenantId: string, userId: string, dto: CreateInvoiceSeriesDto) {
    const exists = await this.seriesRepo.findOne({
      where: { tenantId, series: dto.series, documentType: dto.documentType ?? DocumentType.NFE },
    });
    if (exists) throw new BadRequestException(`Série '${dto.series}' já cadastrada para este tipo`);

    return this.seriesRepo.save(
      this.seriesRepo.create({ ...dto, tenantId, createdBy: userId, lastNumber: 0 }),
    );
  }

  async updateSeries(id: string, tenantId: string, userId: string, dto: UpdateInvoiceSeriesDto) {
    const s = await this.seriesRepo.findOne({ where: { id, tenantId } });
    if (!s) throw new NotFoundException('Série não encontrada');
    Object.assign(s, { ...dto, updatedBy: userId });
    return this.seriesRepo.save(s);
  }

  async deleteSeries(id: string, tenantId: string) {
    const s = await this.seriesRepo.findOne({ where: { id, tenantId } });
    if (!s) throw new NotFoundException('Série não encontrada');
    // Guarda: não permite excluir série com documentos emitidos
    const docCount = await this.docRepo.count({ where: { seriesId: id, tenantId } });
    if (docCount > 0) {
      throw new BadRequestException(
        `Série possui ${docCount} documento(s) emitido(s) e não pode ser excluída. Desative-a em vez disso.`,
      );
    }
    await this.seriesRepo.softRemove(s);
  }

  async getDocuments(tenantId: string, filter: FiscalDocumentFilterDto) {
    const { page, limit, orderId, seriesId } = filter;
    const qb = this.docRepo.createQueryBuilder('d')
      .leftJoinAndSelect('d.series', 'series')
      .where('d.tenantId = :tenantId', { tenantId })
      .andWhere('d.deletedAt IS NULL');

    if (orderId)  qb.andWhere('d.orderId = :orderId',   { orderId });
    if (seriesId) qb.andWhere('d.seriesId = :seriesId', { seriesId });

    qb.orderBy('d.issueDate', 'DESC').skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getDocument(id: string, tenantId: string) {
    const doc = await this.docRepo.findOne({ where: { id, tenantId }, relations: ['series'] });
    if (!doc) throw new NotFoundException('Documento fiscal não encontrado');
    return doc;
  }

  /**
   * Emite um documento fiscal:
   * 1. Incrementa atomicamente o lastNumber da série (SELECT FOR UPDATE)
   * 2. Gera o XML base (sem assinatura — estrutura preparada para SEFAZ)
   * 3. Persiste o FiscalDocument com status DRAFT
   */
  async issueDocument(tenantId: string, userId: string, dto: IssueFiscalDocumentDto) {
    return this.dataSource.transaction(async (em) => {
      // 1. Bloqueia a série para incremento atômico
      const series = await em.findOne(InvoiceSeries, {
        where: { id: dto.seriesId, tenantId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!series) throw new NotFoundException('Série fiscal não encontrada ou inativa');

      // 2. Busca dados do pedido se informado
      let order: Order | null = null;
      if (dto.orderId) {
        order = await em.findOne(Order, {
          where: { id: dto.orderId, tenantId },
          relations: ['customer', 'items'],
        });
        if (!order) throw new NotFoundException('Pedido não encontrado');
      }

      // 3. Incrementa número sequencial
      series.lastNumber += 1;
      await em.save(InvoiceSeries, series);

      const totalAmount = dto.totalAmount ?? (order ? Number(order.total) : 0);
      const recipientName     = dto.recipientName     ?? order?.customer?.name;
      const recipientDocument = dto.recipientDocument ?? order?.customer?.document;

      // 4. Gera XML base (estrutura NF-e simplificada — sem assinatura digital)
      const xmlContent = this.buildXml({
        series:             series.series,
        number:             series.lastNumber,
        documentType:       series.documentType,
        issueDate:          new Date(),
        totalAmount,
        recipientName,
        recipientDocument,
        orderNumber:        order?.orderNumber,
        tenantId,
        notes:              dto.notes,
      });

      // 5. Persiste o documento
      const doc = em.create(FiscalDocument, {
        tenantId,
        createdBy:          userId,
        seriesId:           series.id,
        documentType:       series.documentType,
        number:             series.lastNumber,
        orderId:            dto.orderId,
        status:             FiscalDocumentStatus.DRAFT,
        xmlContent,
        issueDate:          new Date(),
        totalAmount,
        recipientName,
        recipientDocument,
        notes:              dto.notes,
      });

      const saved = await em.save(FiscalDocument, doc);
      this.logger.log(`[Fiscal] Documento ${series.documentType.toUpperCase()} ${series.series}/${series.lastNumber} emitido (tenant ${tenantId})`);
      return saved;
    });
  }

  async cancelDocument(id: string, tenantId: string, userId: string) {
    const doc = await this.getDocument(id, tenantId);
    if (doc.status === FiscalDocumentStatus.AUTHORIZED) {
      throw new BadRequestException('Documentos autorizados devem ser cancelados via SEFAZ');
    }
    if (doc.status === FiscalDocumentStatus.CANCELLED) {
      throw new BadRequestException('Documento já cancelado');
    }
    doc.status    = FiscalDocumentStatus.CANCELLED;
    doc.updatedBy = userId;
    return this.docRepo.save(doc);
  }

  // ─── XML Builder ──────────────────────────────────────────────────────────

  /**
   * Gera XML base NF-e (leiaute simplificado, sem assinatura digital).
   * Estrutura preparada para futura integração com SEFAZ.
   * Campos obrigatórios da NF-e 4.0 estão presentes como placeholders.
   */
  private buildXml(params: {
    series: string;
    number: number;
    documentType: DocumentType;
    issueDate: Date;
    totalAmount: number;
    recipientName?: string;
    recipientDocument?: string;
    orderNumber?: string;
    tenantId: string;
    notes?: string;
  }): string {
    const esc = (s?: string | number) =>
      String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const iso = params.issueDate.toISOString().replace('Z', '-03:00').slice(0, 19) + '-03:00';
    const cNF  = String(params.number).padStart(8, '0');
    const nNF  = String(params.number).padStart(9, '0');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- DOCUMENTO FISCAL BASE — SEM ASSINATURA DIGITAL -->
<!-- Integração SEFAZ pendente de implementação -->
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe versao="4.00" Id="NFe${esc(params.tenantId.replace(/-/g, '').slice(0, 14))}${cNF}">
      <ide>
        <cUF>35</cUF>
        <cNF>${cNF}</cNF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <mod>${params.documentType === DocumentType.NFCE ? '65' : '55'}</mod>
        <serie>${esc(params.series)}</serie>
        <nNF>${nNF}</nNF>
        <dhEmi>${esc(iso)}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <tpAmb>2</tpAmb><!-- 2=Homologação | 1=Produção -->
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>ERP-1.0</verProc>
      </ide>
      <emit>
        <!-- CNPJ do emitente deve ser configurado por tenant -->
        <CNPJ>00000000000000</CNPJ>
        <xNome>EMPRESA EMITENTE</xNome>
        <enderEmit>
          <xLgr>RUA EXEMPLO</xLgr>
          <nro>0</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>01310100</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>ISENTO</IE>
        <CRT>1</CRT>
      </emit>
      <dest>
        <CPF>${esc(params.recipientDocument?.replace(/\D/g, '').slice(0, 11) ?? '00000000000')}</CPF>
        <xNome>${esc(params.recipientName ?? 'CONSUMIDOR FINAL')}</xNome>
        <indIEDest>9</indIEDest>
      </dest>
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${esc(Number(params.totalAmount).toFixed(2))}</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${esc(Number(params.totalAmount).toFixed(2))}</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>9</modFrete>
      </transp>
      <infAdic>
        <infCpl>${esc(params.notes ?? '')}${params.orderNumber ? ` Pedido: ${esc(params.orderNumber)}` : ''}</infCpl>
      </infAdic>
    </infNFe>
    <!-- Assinatura digital será inserida pela integração SEFAZ -->
  </NFe>
</nfeProc>`;
  }
}
