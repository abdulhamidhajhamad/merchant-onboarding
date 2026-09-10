import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface MccItem {
  code: string;
  description: string;
  category: string;
}

@Injectable()
export class MccService {
  private readonly logger = new Logger(MccService.name);
  private catalog: MccItem[] = [];

  constructor() {
    this.loadCatalog();
  }

  private loadCatalog() {
    try {
      const filePath = path.resolve(__dirname, 'data/mcc-catalog.json');
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        this.catalog = JSON.parse(fileContent);
        this.logger.log(`Loaded ${this.catalog.length} MCC codes into active catalog.`);
      } else {
        this.logger.warn('MCC catalog file not found. Falling back to default core set.');
        this.catalog = [
          {
            code: '5812',
            description: 'Eating Places and Restaurants',
            category: 'Food & Beverage',
          },
          {
            code: '5411',
            description: 'Grocery Stores, Supermarkets',
            category: 'Retail',
          },
          {
            code: '6012',
            description: 'Financial Institutions - Merchandise, Services, and Debt Repayment',
            category: 'Financial Services',
          },
          {
            code: '6051',
            description:
              'Non-Financial Institutions - Foreign Currency, Money Orders, and Travelers Cheques',
            category: 'Financial Services',
          },
          {
            code: '6211',
            description: 'Security Brokers/Dealers',
            category: 'Financial Services',
          },
        ];
      }
    } catch (error) {
      this.logger.error(`Failed to load MCC catalog: ${String(error)}`);
      this.catalog = [];
    }
  }

  search(query: string): MccItem[] {
    if (!query) return this.catalog;
    const lowerQuery = query.toLowerCase();
    return this.catalog.filter(
      (item) =>
        item.code.includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery),
    );
  }

  findByCode(code: string): MccItem | undefined {
    return this.catalog.find((item) => item.code === code);
  }

  findAll() {
    return this.catalog;
  }
}
