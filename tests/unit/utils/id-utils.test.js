import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateId } from '../../../src/utils/ma.js';

describe('generateId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('trả về UUID hợp lệ', () => {
    expect(generateId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('tạo ID khác nhau cho các lần gọi liên tiếp', () => {
    expect(generateId()).not.toBe(generateId());
  });

  it('ủy quyền việc tạo ID cho crypto.randomUUID', () => {
    const uuid = '123e4567-e89b-42d3-a456-426614174000';
    const randomUUID = vi
      .spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValue(uuid);

    expect(generateId()).toBe(uuid);
    expect(randomUUID).toHaveBeenCalledOnce();
  });
});
