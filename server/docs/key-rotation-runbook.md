# Encryption-key rotation runbook

Ciphertext must carry a bounded key-version prefix. Decryption selects only an explicitly configured keyring entry and fails with `UNKNOWN_KEY_VERSION` when absent. Never guess a key or silently fall back.

To rotate: provision the new key through the secret manager, add the new version for reads, make it the sole write version, re-encrypt records in bounded audited batches, verify every record, then retire the old read key after the rollback window. Do not log keys, ciphertext, plaintext, tokens, or connection strings.
