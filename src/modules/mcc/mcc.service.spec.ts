import { MccService } from './mcc.service';

describe('MccService', () => {
  let service: MccService;

  beforeEach(() => {
    service = new MccService();
  });

  it('loads a representative catalog with at least 30 official codes', () => {
    const catalog = service.findAll();
    expect(catalog.length).toBeGreaterThanOrEqual(30);
  });

  it('search(query=software) includes MCC 5734', () => {
    const results = service.search('software');
    expect(results.some((item) => item.code === '5734')).toBe(true);
  });

  it('findByCode(4111) returns local/suburban passenger transportation', () => {
    const item = service.findByCode('4111');
    expect(item).toBeDefined();
    expect(item!.code).toBe('4111');
    expect(item!.category).toBe('Travel');
    expect(item!.description.toLowerCase()).toContain('transportation');
  });

  it('catalog items expose only code, description, and category', () => {
    for (const item of service.findAll()) {
      expect(Object.keys(item).sort()).toEqual(['category', 'code', 'description']);
    }
  });

  it('retains original core codes including 6012 and 5812', () => {
    expect(service.findByCode('6012')?.code).toBe('6012');
    expect(service.findByCode('5812')?.code).toBe('5812');
    expect(service.findByCode('5411')?.code).toBe('5411');
  });
});
