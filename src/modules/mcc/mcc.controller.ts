import { Controller, Get, Query, Param } from '@nestjs/common';
import { MccService } from './mcc.service';

@Controller('mcc')
export class MccController {
  constructor(private readonly mccService: MccService) {}

  @Get()
  getAllOrSearch(@Query('query') query?: string, @Query('q') legacyQuery?: string) {
    const searchTerm = (query ?? legacyQuery ?? '').trim();
    if (searchTerm) {
      return this.mccService.search(searchTerm);
    }
    return this.mccService.findAll();
  }

  @Get(':code')
  getByCode(@Param('code') code: string) {
    return this.mccService.findByCode(code);
  }
}