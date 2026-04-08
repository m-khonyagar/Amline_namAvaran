import { describe, expect, it } from 'vitest';
import { mapAxiosLikeError, parseFastApiValidationDetail } from './errorMapper';

describe('parseFastApiValidationDetail', () => {
  it('parses FastAPI array detail', () => {
    const detail = [
      { loc: ['body', 'birth_date'], msg: 'invalid format', type: 'value_error' },
    ];
    const { lines, fieldErrors } = parseFastApiValidationDetail(detail);
    expect(lines.some((l) => l.includes('تاریخ تولد'))).toBe(true);
    expect(fieldErrors['birth_date']?.[0]).toContain('invalid');
  });
});

describe('mapAxiosLikeError', () => {
  it('maps 422 axios response', () => {
    const m = mapAxiosLikeError({
      response: {
        status: 422,
        data: { detail: [{ loc: ['body', 'mobile'], msg: 'required', type: 'value_error' }] },
      },
    });
    expect(m.type).toBe('VALIDATION');
    expect(m.detailLines.length).toBeGreaterThan(0);
    expect(m.hint).toBeDefined();
    expect(m.hint!.length).toBeGreaterThan(10);
  });

  it('maps plain Error to UNKNOWN message', () => {
    const m = mapAxiosLikeError(new Error('حداقل یک مالک الزامی است'));
    expect(m.type).toBe('UNKNOWN');
    expect(m.message).toContain('مالک');
    expect(m.hint).toBeDefined();
  });

  it('maps 400 commission_required from wizard sign', () => {
    const m = mapAxiosLikeError({
      response: { status: 400, data: { detail: 'commission_required' } },
    });
    expect(m.type).toBe('UNKNOWN');
    expect(m.message).toContain('کمیسیون');
    expect(m.hint).toBeDefined();
  });
});
