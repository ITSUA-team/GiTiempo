
declare namespace chrome {
  namespace action {
    const openPopup: undefined | (() => Promise<void>);
  }

  namespace runtime {
    function sendMessage(message: unknown): Promise<unknown>;

    namespace onInstalled {
      function addListener(listener: () => void): void;
    }

    namespace onMessage {
      function addListener(
        listener: (
          message: unknown,
          sender: unknown,
          sendResponse: (response?: unknown) => void,
        ) => boolean | void,
      ): void;
      function removeListener(
        listener: (
          message: unknown,
          sender: unknown,
          sendResponse: (response?: unknown) => void,
        ) => boolean | void,
      ): void;
    }
  }

  namespace storage {
    namespace local {
      function get(
        keys?: null | string | string[] | Record<string, unknown>,
      ): Promise<Record<string, unknown>>;
      function remove(keys: string | string[]): Promise<void>;
      function set(items: Record<string, unknown>): Promise<void>;
    }
  }

  namespace tabs {
    interface Tab {
      id?: number;
      title?: string;
      url?: string;
    }

    interface QueryInfo {
      active?: boolean;
      currentWindow?: boolean;
      url?: string | string[];
    }

    function create(options: { url: string }): Promise<void>;
    function query(options: QueryInfo): Promise<Tab[]>;
    function sendMessage(tabId: number, message: unknown): Promise<unknown>;
  }
}
