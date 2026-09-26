/**
 * Map the backend `errors` object onto React Hook Form fields.
 *
 * Only the fields the form actually renders are set: `setError` on a name no input carries would
 * hide the message completely. Returns how many landed, so the caller can fall back to a
 * form-level message for the rest.
 */
export const mapServerErrorsToForm = (serverErrors, setError, formFields) => {
  const fields = formFields ? new Set(formFields) : null;
  let mapped = 0;

  Object.keys(serverErrors ?? {}).forEach((field) => {
    const message = serverErrors[field]?.[0];
    if (!message || (fields && !fields.has(field))) return;
    setError(field, { type: 'server', message });
    mapped += 1;
  });

  return mapped;
};

/**
 * The sentence to show on the form itself for a failure that belongs to no single box.
 *
 * A locked account is the one case with its own wording: the reason comes back in
 * `errors.reason` and the customer needs to read it to know who to talk to (D-024). Its 403 is
 * only ever returned once the password is correct, so it never leaks whether an account exists.
 */
export const formErrorMessage = (apiError) => {
  if (apiError.code === 'ACCOUNT_LOCKED') {
    const reason = apiError.fieldErrors?.reason?.[0];
    return reason
      ? `Your account has been locked. Reason: ${reason}. Please contact the administrator.`
      : 'Your account has been locked. Please contact the administrator.';
  }

  return apiError.friendlyMessage;
};
