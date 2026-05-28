import { toValue, type MaybeRefOrGetter } from "vue";

export interface QueryAccessOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  enabled?: MaybeRefOrGetter<boolean>;
}

export function isQueryEnabled(options: QueryAccessOptions): boolean {
  return Boolean(toValue(options.accessToken)) &&
    (options.enabled === undefined || Boolean(toValue(options.enabled)));
}
