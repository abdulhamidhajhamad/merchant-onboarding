import { Injectable, NotFoundException } from '@nestjs/common';
import { mccSchema } from '../../common/schemas/mcc.schema';

export interface MccItem {
  code: string;
  description: string;
  category: string;
  confidenceScore: number;
  riskTags: ('STANDARD' | 'ENHANCED_REVIEW' | 'RESTRICTED')[];
}

@Injectable()
export class MccService {
  private readonly catalog: MccItem[] = [
    { code: '5812', description: 'Eating Places and Restaurants', category: 'Food & Beverage', confidenceScore: 0.95, riskTags: ['STANDARD'] },
    { code: '5411', description: 'Grocery Stores and Supermarkets', category: 'Retail', confidenceScore: 0.98, riskTags: ['STANDARD'] },
    { code: '5734', description: 'Computer Software Stores', category: 'Technology', confidenceScore: 0.90, riskTags: ['STANDARD'] },
    { code: '7995', description: 'Gambling Transactions & Betting', category: 'Entertainment', confidenceScore: 0.99, riskTags: ['RESTRICTED'] },
    { code: '5967', description: 'Direct Marketing - Inbound Telemarketing', category: 'Direct Marketing', confidenceScore: 0.85, riskTags: ['ENHANCED_REVIEW'] },
  ];

  findAll(): MccItem[] {
    return this.catalog;
  }

  search(query: string): MccItem[] {
    const q = query.toLowerCase().trim();
    return this.catalog.filter(
      (item) => item.code.includes(q) || item.description.toLowerCase().includes(q) || item.category.toLowerCase().includes(q),
    );
  }

  findByCode(code: string): MccItem {
    const item = this.catalog.find((m) => m.code === code);
    if (!item) {
      throw new NotFoundException(`MCC code ${code} not found`);
    }
    return item;
  }
}