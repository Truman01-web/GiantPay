import { forwardRef } from 'react';
import { Input, type InputProps } from '@/components/ui/Input';

/** Malawi-context phone input. Displays/validates against the +265 format
 * but does not hard-code carrier support — see docs §27 localization. */
export const PhoneInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <Input ref={ref} type="tel" inputMode="tel" placeholder="+265 991 234 567" {...props} />
));
PhoneInput.displayName = 'PhoneInput';
