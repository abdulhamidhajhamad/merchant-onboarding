import { Module } from '@nestjs/common';
import { MccService } from './mcc.service';
import { MccController } from './mcc.controller';

@Module({
  controllers: [MccController],
  providers: [MccService],
  exports: [MccService],
})
export class MccModule {}