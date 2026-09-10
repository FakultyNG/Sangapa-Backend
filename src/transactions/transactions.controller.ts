import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedRequest, AuthenticatedUser } from '../common/types/authenticated-request';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { TransactionsService } from './transactions.service';
import { ReepayTransaction, ReepayTransactionList } from './transactions.types';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  listTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Query() query: ListTransactionsQueryDto,
  ): Promise<ReepayTransactionList> {
    return this.transactions.listTransactions(user.id, query.limit ?? 20, query.cursor, request.id);
  }

  @Get(':id')
  getTransaction(
    @Param('id') transactionId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ReepayTransaction> {
    return this.transactions.getTransaction(transactionId, request.id);
  }
}
