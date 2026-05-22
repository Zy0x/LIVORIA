type LogMethod = (...args: unknown[]) => void;

const isDevelopment = process.env.NODE_ENV !== 'production';

function devOnly(method: LogMethod): LogMethod {
  return (...args) => {
    if (isDevelopment) method(...args);
  };
}

export const logger = {
  debug: devOnly(console.debug.bind(console)),
  info: devOnly(console.info.bind(console)),
  warn: devOnly(console.warn.bind(console)),
  error: console.error.bind(console),
};
