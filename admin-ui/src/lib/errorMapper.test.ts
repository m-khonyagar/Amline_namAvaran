import { describe, expect, it } from 'vitest';
import { mapAxiosLikeError, parseFastApiValidationDetail } from './errorMapper';

describe('parseFastApiValidationDetail', () => {
  it('parses FastAPI array detail', () => {
    const detail = [
      { loc: ['body', 'birth_date'], msg: 'invalid format', type: 'value_error' },
    ];
    const { message, fieldErrors } = parseFastApiValidationDetail(detail);
    expect(message).toContain('invalid format');
    expect(fieldErrors['birth_date']?.[0]).toContain('invalid');
  });
});

describe('mapAxiosLikeError', () => {
  it('maps 422 axios response', () => {
    const m = mapAxiosLikeError({
      isAxiosError: true,
      response: {
        status: 422,
        data: { detail: [{ loc: ['body', 'mobile'], msg: 'required', type: 'value_error' }] },
      },
    });
    expect(m.type).toBe('validation');
    expect((m.detailLines ?? []).length).toBeGreaterThan(0);
  });

  it('maps plain Error to UNKNOWN message', () => {
    const m = mapAxiosLikeError(new Error('حداقل یک مالک الزامی است'));
    expect(m.type).toBe('unknown');
    expect(m.message).toContain('مالک');
  });

  it('maps 400 commission_required from wizard sign', () => {
    const m = mapAxiosLikeError({
      isAxiosError: true,
      response: { status: 400, data: { detail: 'commission_required' } },
    });
    expect(m.type).toBe('amline');
    expect(m.message).toContain('commission_required');
  });
});
