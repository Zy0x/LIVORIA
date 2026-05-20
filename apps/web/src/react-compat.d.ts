import type { JSX as ReactJSX } from 'react';

declare global {
  namespace JSX {
    type Element = ReactJSX.Element;
    interface ElementClass {
      props: Record<string, unknown>;
      render(): ReactJSX.Element | null;
    }
    interface ElementAttributesProperty {
      props: Record<string, unknown>;
    }
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
  }
}

export {};
