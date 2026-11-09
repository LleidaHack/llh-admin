/** Keep each mail within its own request budget; never replay an ambiguous send. */
export function createSequentialMailBatch<T extends { name: string }>(
  recipients: readonly T[],
  send: (recipient: T) => Promise<void>,
) {
  let execution: Promise<void> | undefined;
  return (progress: (sent: number, total: number) => void) => {
    execution ??= (async () => {
      let sent = 0;
      progress(sent, recipients.length);
      for (const recipient of recipients) {
        try {
          await send(recipient);
        } catch {
          throw new Error(
            `Enviament aturat: ${sent} de ${recipients.length} processats. No s'ha pogut confirmar l'enviament a ${recipient.name}; podria haver-se enviat. La resta no s'ha intentat. Comprova l'estat dels correus abans de tornar a enviar.`,
          );
        }
        progress(++sent, recipients.length);
      }
    })();
    return execution;
  };
}
