# Backup and restore runbook

Backups and durable off-site storage are external infrastructure and are not implemented by this repository.

1. Create an encrypted database backup using the infrastructure-approved mechanism and record its checksum and timestamps without credentials.
2. Verify the checksum before restore.
3. Restore only to a disposable isolated database whose name ends in `_test`; the recovery guard rejects every other target.
4. Run migration verification. The current schema must apply 15 migrations initially and zero on repeat with matching checksums.
5. Run ledger-balance verification, then compare audit and outbox counts and deduplication keys with the backup manifest.
6. Run the complete zero-skip integration suite without external provider access.
7. Measure recovery-point loss from the backup timestamp and recovery time from restore start. Record results as a drill; do not claim a drill until independently executed.
