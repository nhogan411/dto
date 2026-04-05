import '@testing-library/jest-dom'

const originalStyleGetter = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'style')?.get;
const styleMap = new WeakMap<CSSStyleDeclaration, Record<string, string>>();

if (originalStyleGetter) {
  Object.defineProperty(HTMLElement.prototype, 'style', {
    get() {
      const style = originalStyleGetter.call(this);
      if (!styleMap.has(style)) {
        styleMap.set(style, {});
      }
      const overrides = styleMap.get(style)!;

      return new Proxy(style, {
        get(target: CSSStyleDeclaration, prop: string) {
          if (overrides[prop] !== undefined) {
            return overrides[prop];
          }
          return Reflect.get(target, prop);
        },
        set(target: CSSStyleDeclaration, prop: string, value: string) {
          overrides[prop] = value;
          return Reflect.set(target, prop, value);
        },
      });
    },
    configurable: true,
  });
}



