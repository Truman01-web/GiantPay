import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { QrCodeDisplay } from './QrCodeDisplay';
import type { ScanToPayCode } from '@/types/scanToPay';

interface QrCounterDisplayProps {
  code: ScanToPayCode;
  merchantName?: string;
}

export function QrCounterDisplay({ code, merchantName }: QrCounterDisplayProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex justify-end w-full max-w-sm print:hidden">
        <Button variant="secondary" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print counter stand
        </Button>
      </div>

      <div className="w-full max-w-sm rounded-[var(--radius-xl)] border-2 border-[var(--color-navy-900)] bg-white p-6 shadow-md text-center print:border-none print:shadow-none print:p-0">
        {/* Header Branding */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-[length:var(--text-h3)] font-black tracking-tight text-[var(--color-navy-900)]">
            Giant<span className="text-[var(--color-blue-600)]">Pay</span>
          </span>
        </div>

        <h2 className="text-[length:var(--text-h3)] font-bold text-[var(--color-navy-900)]">
          Scan to Pay
        </h2>

        {merchantName && (
          <p className="mt-1 text-[length:var(--text-body)] font-medium text-[var(--color-neutral-700)]">
            {merchantName}
          </p>
        )}

        <p className="text-[length:var(--text-help)] text-[var(--color-neutral-500)] mb-4">
          {code.label}
        </p>

        {/* QR Code */}
        <div className="my-2 flex justify-center">
          <QrCodeDisplay
            url={code.checkoutUrl}
            label={code.label}
            size={220}
            showActions={false}
          />
        </div>

        {/* Amount Info */}
        <div className="mt-4">
          {code.mode === 'FIXED' && code.amountMinor != null ? (
            <div className="flex flex-col items-center">
              <span className="text-[length:var(--text-help)] text-[var(--color-neutral-500)] uppercase tracking-wider font-semibold">
                Amount
              </span>
              <AmountDisplay
                amountMinor={code.amountMinor}
                currency={code.currency}
                size="xl"
                className="text-[var(--color-navy-900)] font-extrabold"
              />
            </div>
          ) : (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-neutral-50)] p-2">
              <span className="text-[length:var(--text-label)] font-medium text-[var(--color-neutral-700)]">
                Enter amount on checkout
              </span>
              {code.minAmountMinor != null && (
                <p className="text-[length:var(--text-help)] text-[var(--color-neutral-500)] mt-0.5">
                  Min:{' '}
                  <AmountDisplay
                    amountMinor={code.minAmountMinor}
                    currency={code.currency}
                    size="sm"
                  />
                  {code.maxAmountMinor != null && (
                    <>
                      {' · '}Max:{' '}
                      <AmountDisplay
                        amountMinor={code.maxAmountMinor}
                        currency={code.currency}
                        size="sm"
                      />
                    </>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 border-t border-[var(--color-neutral-200)] pt-4 text-left">
          <ol className="text-[length:var(--text-help)] text-[var(--color-neutral-600)] space-y-1 list-decimal list-inside">
            <li>Scan this QR code with your phone camera</li>
            <li>Select Airtel Money, Mpamba or Card</li>
            <li>Confirm payment and show receipt</li>
          </ol>
        </div>

        <p className="mt-4 text-[10px] text-[var(--color-neutral-400)] uppercase tracking-widest">
          Powered by GiantPay · Secure Payments
        </p>
      </div>
    </div>
  );
}
