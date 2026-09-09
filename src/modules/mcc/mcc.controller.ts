import { Controller, Get, Query, Param } from '@nestjs/common';
import { MccService } from './mcc.service';

@Controller('mcc')
export class MccController {
  constructor(private readonly mccService: MccService) {}

  @Get()
  getAllOrSearch(@Query('q') query?: string) {
    if (query) {
      return this.mccService.search(query);
    }
    return this.mccService.findAll();
  }

  @Get(':code')
  getByCode(@Param('code') code: string) {
    return this.mccService.findByCode(code);
  }
}