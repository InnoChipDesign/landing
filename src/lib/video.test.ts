import { describe, expect, it } from 'vitest';
import { frameSrcFor, parseVideoUrl, UnknownVideoProviderError } from './video';

/**
 * One test per provider (01 §7). Neither VK nor Dzen publishes a stability guarantee for its embed
 * URL format, so a format change should surface here as a failing test rather than as a black box
 * on a project page that nobody reports for a month.
 */
describe('parseVideoUrl', () => {
  it('parses every accepted YouTube shape to the same nocookie embed', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    ]) {
      const embed = parseVideoUrl(url);
      expect(embed.provider).toBe('youtube');
      expect(embed.id).toBe('dQw4w9WgXcQ');
      expect(embed.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
      expect(embed.frameSrcOrigin).toBe('https://www.youtube-nocookie.com');
    }
  });

  it('parses Rutube', () => {
    const embed = parseVideoUrl('https://rutube.ru/video/0123456789abcdef0123456789abcdef/');
    expect(embed.provider).toBe('rutube');
    expect(embed.embedUrl).toBe('https://rutube.ru/play/embed/0123456789abcdef0123456789abcdef');
    expect(embed.watchUrl).toBe('https://rutube.ru/video/0123456789abcdef0123456789abcdef/');
  });

  it('parses VK Video from both hosts, keeping the negative owner id', () => {
    for (const url of ['https://vk.com/video-12345_67890', 'https://vkvideo.ru/video-12345_67890']) {
      const embed = parseVideoUrl(url);
      expect(embed.provider).toBe('vk');
      expect(embed.embedUrl).toBe('https://vk.com/video_ext.php?oid=-12345&id=67890&hd=2');
    }
  });

  it('parses Dzen', () => {
    const embed = parseVideoUrl('https://dzen.ru/video/watch/abc123XYZ');
    expect(embed.provider).toBe('dzen');
    expect(embed.embedUrl).toBe('https://dzen.ru/embed/abc123XYZ');
  });

  it('throws on an unsupported host rather than rendering an empty box', () => {
    expect(() => parseVideoUrl('https://vimeo.com/123456')).toThrow(UnknownVideoProviderError);
    expect(() => parseVideoUrl('not a url')).toThrow(UnknownVideoProviderError);
  });
});

describe('frameSrcFor', () => {
  it("is 'none' when no project has a video", () => {
    expect(frameSrcFor([])).toBe("'none'");
  });

  it('is exactly as wide as the content requires, deduplicated and sorted', () => {
    expect(
      frameSrcFor([
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=aaaaaaaaaaa',
        'https://dzen.ru/video/watch/abc123XYZ',
      ]),
    ).toBe('https://dzen.ru https://www.youtube-nocookie.com');
  });
});
