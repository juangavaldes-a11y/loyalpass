// Last-resort handlers: log the failure, flush the error reporter, then exit so the
// orchestrator restarts a clean process (continuing after uncaughtException is unsafe).

function installProcessHandlers({
  logger,
  reporter,
  flushTimeoutMs = 2000,
  exit = (code) => process.exit(code),
  proc = process,
} = {}) {
  let exiting = false;

  const handle = (kind) => async (reason) => {
    if (exiting) return;
    exiting = true;

    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.fatal(kind, error);

    try {
      reporter.captureException(error, { kind });
      await Promise.race([
        reporter.flush(flushTimeoutMs),
        new Promise((resolve) => setTimeout(resolve, flushTimeoutMs + 500).unref()),
      ]);
    } finally {
      exit(1);
    }
  };

  const onRejection = handle('unhandledRejection');
  const onException = handle('uncaughtException');
  proc.on('unhandledRejection', onRejection);
  proc.on('uncaughtException', onException);

  return function uninstall() {
    proc.off('unhandledRejection', onRejection);
    proc.off('uncaughtException', onException);
  };
}

module.exports = { installProcessHandlers };
