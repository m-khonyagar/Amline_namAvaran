import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, contractApi } from './contractApi';

describe('contractApi.uploadFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends FormData without forcing multipart content-type header', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { id: '10001', url: null },
    } as never);

    const file = new File(['binary'], 'cheque.png', { type: 'image/png' });
    await contractApi.uploadFile(file, 'CHEQUE_IMAGE');

    expect(postSpy).toHaveBeenCalledTimes(1);
    const [url, body, config] = postSpy.mock.calls[0];
    expect(url).toBe('/files/upload');
    expect(body).toBeInstanceOf(FormData);
    expect(config).toBeUndefined();

    const form = body as FormData;
    expect(form.get('file')).toBe(file);
    expect(form.get('file_type')).toBe('CHEQUE_IMAGE');
  });
});
