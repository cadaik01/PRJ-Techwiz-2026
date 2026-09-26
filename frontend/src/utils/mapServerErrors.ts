import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/** Map backend `errors` object onto React Hook Form fields. */
export const mapServerErrorsToForm = <TFieldValues extends FieldValues>(
  serverErrors: Record<string, string[]>,
  setError: UseFormSetError<TFieldValues>,
) => {
  Object.keys(serverErrors).forEach((field) => {
    const message = serverErrors[field]?.[0];
    if (message) {
      setError(field as Path<TFieldValues>, { type: 'server', message });
    }
  });
};
