export const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
export const getTimestamp = () => new Date().toISOString();
export const delay = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const normalizeNameParts = (name: string): string[] =>
  name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

export function logInvocation(
  target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

  descriptor.value = function (...args: unknown[]) {
    const className =
      (this as { constructor?: { name?: string } })?.constructor?.name ||
      (target as { constructor?: { name?: string } })?.constructor?.name ||
      (target as { name?: string })?.name ||
      'UnknownClass';

    console.log(`[${getTimestamp()}] [${className}.${propertyKey}] вызван`);

    try {
      const result = originalMethod.apply(this, args);

      if (result && typeof (result as Promise<unknown>).then === 'function') {
        return (result as Promise<unknown>)
          .then((value) => {
            console.log(`[${getTimestamp()}] [${className}.${propertyKey}] успешно завершен`);
            return value;
          })
          .catch((error) => {
            const errorType = (error as { name?: string })?.name || typeof error;
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(
              `[${getTimestamp()}] [${className}.${propertyKey}] завершен с ошибкой: ${errorType} - ${errorMessage}`,
            );
            throw error;
          });
      }

      console.log(`[${getTimestamp()}] [${className}.${propertyKey}] успешно завершен`);
      return result;
    } catch (error: unknown) {
      const errorType = (error as { name?: string })?.name || typeof error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `[${getTimestamp()}] [${className}.${propertyKey}] завершен с ошибкой: ${errorType} - ${errorMessage}`,
      );
      throw error;
    }
  };

  return descriptor;
}
