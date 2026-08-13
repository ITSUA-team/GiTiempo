import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

export function useAvatarImage(
  avatarUrl: MaybeRefOrGetter<string | null | undefined>,
) {
  const hasImageFailed = ref(false);

  watch(
    () => toValue(avatarUrl),
    () => {
      hasImageFailed.value = false;
    },
  );

  const imageUrl = computed(() => {
    const nextImageUrl = toValue(avatarUrl)?.trim();

    return nextImageUrl && !hasImageFailed.value ? nextImageUrl : undefined;
  });

  const handleImageError = (): void => {
    hasImageFailed.value = true;
  };

  return { handleImageError, imageUrl };
}

export const avatarImagePtClass = 'size-full rounded-full object-cover';
