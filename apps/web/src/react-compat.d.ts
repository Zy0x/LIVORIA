import type { JSX as ReactJSX, ReactNode } from 'react';

declare module 'react' {
  namespace JSX {
    interface ElementClass {
      props: Record<string, unknown>;
      render(): ReactNode;
    }
    interface ElementAttributesProperty {
      props: Record<string, unknown>;
    }
  }
}

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
