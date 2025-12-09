/// <reference no-default-lib="true" />
/// <reference lib="deno.window" />

declare namespace Deno {
  const env: {
    get(key: string): string | undefined;
  };
}

declare const Headers: {
  prototype: Headers;
  new(init?: HeadersInit): Headers;
};

declare interface Headers {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: any): void;
}
