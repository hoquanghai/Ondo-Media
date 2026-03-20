import { PaginatedResponseDto } from './paginated-response.dto';

describe('PaginatedResponseDto', () => {
  describe('from()', () => {
    it('should calculate totalPages correctly', () => {
      const result = PaginatedResponseDto.from(['a', 'b', 'c'], 25, 1, 10);

      expect(result.meta.totalPages).toBe(3); // ceil(25/10) = 3
      expect(result.meta.total).toBe(25);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should calculate totalPages as 1 when total equals limit', () => {
      const result = PaginatedResponseDto.from([1, 2, 3, 4, 5], 5, 1, 5);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should calculate totalPages as 1 when total is less than limit', () => {
      const result = PaginatedResponseDto.from([1, 2], 2, 1, 10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should set hasNext to true when more pages exist', () => {
      const result = PaginatedResponseDto.from(['a'], 30, 1, 10);

      expect(result.meta.hasNext).toBe(true);
      expect(result.meta.hasPrev).toBe(false);
    });

    it('should set hasPrev to true when on page > 1', () => {
      const result = PaginatedResponseDto.from(['a'], 30, 2, 10);

      expect(result.meta.hasPrev).toBe(true);
      expect(result.meta.hasNext).toBe(true);
    });

    it('should set hasNext to false on last page', () => {
      const result = PaginatedResponseDto.from(['a'], 30, 3, 10);

      expect(result.meta.hasNext).toBe(false);
      expect(result.meta.hasPrev).toBe(true);
    });

    it('should set both hasNext and hasPrev to false for single page', () => {
      const result = PaginatedResponseDto.from([1, 2, 3], 3, 1, 10);

      expect(result.meta.hasNext).toBe(false);
      expect(result.meta.hasPrev).toBe(false);
    });

    it('should handle empty items', () => {
      const result = PaginatedResponseDto.from([], 0, 1, 10);

      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
      expect(result.meta.hasNext).toBe(false);
      expect(result.meta.hasPrev).toBe(false);
    });

    it('should handle page greater than totalPages', () => {
      const result = PaginatedResponseDto.from([], 5, 10, 5);

      expect(result.meta.page).toBe(10);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasNext).toBe(false);
      expect(result.meta.hasPrev).toBe(true);
    });

    it('should preserve the items array', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = PaginatedResponseDto.from(items, 3, 1, 10);

      expect(result.items).toEqual(items);
      expect(result.items).toHaveLength(3);
    });

    it('should handle limit of 1', () => {
      const result = PaginatedResponseDto.from(['a'], 5, 3, 1);

      expect(result.meta.totalPages).toBe(5);
      expect(result.meta.hasNext).toBe(true);
      expect(result.meta.hasPrev).toBe(true);
    });
  });
});
