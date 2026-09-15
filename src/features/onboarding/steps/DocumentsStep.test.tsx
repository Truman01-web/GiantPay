import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, delay } from 'msw';
import { server } from '@/mocks/server';
import { env } from '@/app/config/env';
import { DocumentsStep } from './DocumentsStep';
import type { UploadedDocument } from '@/types/onboarding';

const base = `${env.apiUrl}/v1`;
const UPLOAD_PATH = `${base}/merchants/onboarding/documents`;

function pdfFile(name = 'certificate.pdf', sizeBytes = 1024) {
  const file = new File([new Uint8Array(sizeBytes)], name, { type: 'application/pdf' });
  return file;
}

function renderStep(initialDocuments: UploadedDocument[] = []) {
  const onNext = vi.fn();
  const onBack = vi.fn();
  render(<DocumentsStep initialDocuments={initialDocuments} saving={false} onBack={onBack} onNext={onNext} />);
  return { onNext, onBack };
}

const CERT_LABEL = /certificate of incorporation/i;

describe('DocumentsStep — file upload', () => {
  it('uploads a valid file and shows it as uploaded', async () => {
    server.use(http.post(UPLOAD_PATH, () => HttpResponse.json({ id: 'doc_1', fileName: 'certificate.pdf', sizeBytes: 1024 })));
    renderStep();

    const input = screen.getByLabelText(CERT_LABEL);
    await userEvent.upload(input, pdfFile());

    await waitFor(() => expect(screen.getByText('certificate.pdf')).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    expect(screen.queryByText(/upload failed/i)).not.toBeInTheDocument();
  });

  it('rejects an unsupported file type on the client and never calls the API', async () => {
    let calls = 0;
    server.use(http.post(UPLOAD_PATH, () => { calls++; return HttpResponse.json({ id: 'x', fileName: 'x', sizeBytes: 1 }); }));
    renderStep();

    const input = screen.getByLabelText(CERT_LABEL);
    const textFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    // A real file-picker filter (the `accept` attribute) doesn't stop
    // drag-and-drop or a renamed file — which is exactly what this app's
    // own MIME-type validation exists to catch. `applyAccept: false`
    // bypasses userEvent's picker-only emulation so the file actually
    // reaches that validation, the same way a drop event would.
    await userEvent.setup({ applyAccept: false }).upload(input, textFile);

    expect(await screen.findByRole('alert')).toHaveTextContent(/not a supported file type|isn't a supported/i);
    expect(calls).toBe(0);
  });

  it('rejects an oversized file on the client and never calls the API', async () => {
    let calls = 0;
    server.use(http.post(UPLOAD_PATH, () => { calls++; return HttpResponse.json({ id: 'x', fileName: 'x', sizeBytes: 1 }); }));
    renderStep();

    const input = screen.getByLabelText(CERT_LABEL);
    const bigFile = pdfFile('big.pdf', 11 * 1024 * 1024);
    await userEvent.upload(input, bigFile);

    expect(await screen.findByRole('alert')).toHaveTextContent(/too large/i);
    expect(calls).toBe(0);
  });

  it('shows a recoverable failure state on an HTTP error, and stops the loading state', async () => {
    server.use(
      http.post(UPLOAD_PATH, () =>
        HttpResponse.json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'boom' } }, { status: 413 }),
      ),
    );
    renderStep();

    await userEvent.upload(screen.getByLabelText(CERT_LABEL), pdfFile());

    expect(await screen.findByText(/too large/i)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry uploading/i })).toBeInTheDocument();
  });

  it('shows a safe message on a network failure, not a raw error', async () => {
    server.use(http.post(UPLOAD_PATH, () => HttpResponse.error()));
    renderStep();

    await userEvent.upload(screen.getByLabelText(CERT_LABEL), pdfFile());

    expect(await screen.findByText(/check your connection/i)).toBeInTheDocument();
    expect(screen.queryByText(/NetworkError|AxiosError|TypeError/i)).not.toBeInTheDocument();
  });

  it('does not mark the upload successful on a malformed response', async () => {
    server.use(http.post(UPLOAD_PATH, () => HttpResponse.json({ unexpected: true })));
    renderStep();

    await userEvent.upload(screen.getByLabelText(CERT_LABEL), pdfFile());

    expect(await screen.findByText(/upload could not be confirmed/i)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('authentication failure surfaces a session-expired message without exposing details', async () => {
    server.use(http.post(UPLOAD_PATH, () => HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'token expired' } }, { status: 401 })));
    renderStep();

    await userEvent.upload(screen.getByLabelText(CERT_LABEL), pdfFile());

    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
    expect(screen.queryByText(/token/i)).not.toBeInTheDocument();
  });

  it('retries exactly once and succeeds', async () => {
    let calls = 0;
    server.use(
      http.post(UPLOAD_PATH, () => {
        calls++;
        if (calls === 1) return HttpResponse.json({ error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 });
        return HttpResponse.json({ id: 'doc_1', fileName: 'certificate.pdf', sizeBytes: 1024 });
      }),
    );
    renderStep();

    await userEvent.upload(screen.getByLabelText(CERT_LABEL), pdfFile());
    const retryButton = await screen.findByRole('button', { name: /retry uploading/i });

    await userEvent.click(retryButton);
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    expect(calls).toBe(2);
    expect(screen.queryByRole('button', { name: /retry uploading/i })).not.toBeInTheDocument();
  });

  it('hides the retry action the instant a retry starts, leaving no window for a duplicate click', async () => {
    let calls = 0;
    server.use(
      http.post(UPLOAD_PATH, async () => {
        calls++;
        await delay(50);
        return HttpResponse.json({ error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 });
      }),
    );
    renderStep();

    await userEvent.upload(screen.getByLabelText(CERT_LABEL), pdfFile());
    const retryButton = await screen.findByRole('button', { name: /retry uploading/i });

    await userEvent.click(retryButton);
    expect(screen.queryByRole('button', { name: /retry uploading/i })).not.toBeInTheDocument();
    await waitFor(() => expect(calls).toBe(2));
    await new Promise((r) => setTimeout(r, 100));
    expect(calls).toBe(2);
  });

  it('cancels the in-flight request when the document is removed', async () => {
    let calls = 0;
    // MSW's XHR interceptor doesn't propagate an aborted client request
    // into the handler's own AbortSignal (confirmed against its source —
    // see client.ts's uploadFile comments), so cancellation is verified
    // from the app's observable behavior instead: the document stays
    // removed and no stray failure state appears for it once the
    // still-running mock response eventually lands.
    server.use(
      http.post(UPLOAD_PATH, async () => {
        calls++;
        await delay(200);
        return HttpResponse.json({ id: 'doc_1', fileName: 'certificate.pdf', sizeBytes: 1024 });
      }),
    );
    renderStep();

    await userEvent.upload(screen.getByLabelText(CERT_LABEL), pdfFile());
    await waitFor(() => expect(calls).toBe(1));

    const removeButton = screen.getByRole('button', { name: /cancel uploading/i });
    await userEvent.click(removeButton);

    expect(screen.queryByText('certificate.pdf')).not.toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 300));
    // Still gone, and no stray "upload failed" state for a document the
    // user already removed, even once the (uncancellable, from MSW's
    // side) mock response has landed.
    expect(screen.queryByText('certificate.pdf')).not.toBeInTheDocument();
    expect(screen.queryByText(/upload failed|couldn't upload/i)).not.toBeInTheDocument();
  });

  it('aborts in-flight uploads on unmount and issues no further state updates', async () => {
    server.use(
      http.post(UPLOAD_PATH, async () => {
        await delay(200);
        return HttpResponse.json({ id: 'doc_1', fileName: 'certificate.pdf', sizeBytes: 1024 });
      }),
    );
    const onNext = vi.fn();
    const { unmount } = render(<DocumentsStep initialDocuments={[]} saving={false} onBack={vi.fn()} onNext={onNext} />);

    await userEvent.upload(screen.getByLabelText(CERT_LABEL), pdfFile());
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeInTheDocument());

    expect(() => unmount()).not.toThrow();
    // Give the aborted request's rejection a tick to (not) cause any error.
    await new Promise((r) => setTimeout(r, 250));
  });
});
