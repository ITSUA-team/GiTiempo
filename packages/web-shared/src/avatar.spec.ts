import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';

import { useAvatarImage } from './avatar';

describe('useAvatarImage', () => {
  it('exposes a trimmed url when one is available', () => {
    const { imageUrl } = useAvatarImage(
      '  https://cdn.example.test/avatar.png  ',
    );

    expect(imageUrl.value).toBe('https://cdn.example.test/avatar.png');
  });

  it('exposes nothing when the url is missing or blank', () => {
    expect(useAvatarImage(null).imageUrl.value).toBeUndefined();
    expect(useAvatarImage(undefined).imageUrl.value).toBeUndefined();
    expect(useAvatarImage('   ').imageUrl.value).toBeUndefined();
  });

  it('stops exposing the url once the image fails to load', () => {
    const { handleImageError, imageUrl } = useAvatarImage(
      'https://cdn.example.test/broken.png',
    );

    handleImageError();

    expect(imageUrl.value).toBeUndefined();
  });

  it('retries a new url after a previous one failed', async () => {
    const avatarUrl = ref<string | null>('https://cdn.example.test/broken.png');
    const { handleImageError, imageUrl } = useAvatarImage(avatarUrl);

    handleImageError();
    expect(imageUrl.value).toBeUndefined();

    avatarUrl.value = 'https://cdn.example.test/fresh.png';
    await nextTick();

    expect(imageUrl.value).toBe('https://cdn.example.test/fresh.png');
  });

  it('tracks a getter source', async () => {
    const avatarUrl = ref<string | null>(null);
    const { imageUrl } = useAvatarImage(() => avatarUrl.value);

    expect(imageUrl.value).toBeUndefined();

    avatarUrl.value = 'https://cdn.example.test/later.png';
    await nextTick();

    expect(imageUrl.value).toBe('https://cdn.example.test/later.png');
  });
});
