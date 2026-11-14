export async function runMigrationGate(migrate: () => Promise<unknown>, start: () => Promise<unknown>): Promise<void> {
  await migrate();
  await start();
}
