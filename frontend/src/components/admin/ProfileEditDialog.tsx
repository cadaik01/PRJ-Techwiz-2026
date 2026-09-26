import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/common/modal/Dialog';
import { Button } from '@/components/common/forms/Button';
import { Input } from '@/components/common/forms/Input';
import { Textarea } from '@/components/common/forms/Textarea';
import { ApiError } from '@/lib/ApiError';

import './ProfileEditDialog.css';

export type EditField = {
  name: string;
  label: string;
  value: string;
  multiline?: boolean;
  type?: 'text' | 'tel' | 'number';
  /** The API rejects this one when blank, so it carries the red asterisk. */
  required?: boolean;
};

/** The admin's version of a profile form: contact details only. Whatever it cannot edit is
 *  explained by `note` rather than shown as a disabled box the admin would keep clicking. */
export function ProfileEditDialog({
  open,
  onOpenChange,
  title,
  note,
  fields,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  note: string;
  fields: EditField[];
  pending: boolean;
  onSave: (values: Record<string, string>) => Promise<unknown>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Re-seed from the record every time the dialog opens, so re-opening after a cancel does
  // not keep the abandoned edits.
  const [seededFor, setSeededFor] = useState<boolean | null>(null);
  if (open !== seededFor) {
    setSeededFor(open);
    if (open) {
      setValues(Object.fromEntries(fields.map((field) => [field.name, field.value])));
      setErrors({});
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    // Only what actually changed: an untouched field must not be sent, or a phone number the
    // admin never looked at would be revalidated against D-028 for no reason.
    const changed = Object.fromEntries(
      fields
        .filter((field) => values[field.name] !== field.value)
        .map((field) => [field.name, values[field.name]]),
    );
    if (Object.keys(changed).length === 0) {
      onOpenChange(false);
      return;
    }
    try {
      await onSave(changed);
      onOpenChange(false);
    } catch (error) {
      const fieldErrors = ApiError.fromUnknown(error).fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, messages]) => [key, String(messages[0] ?? '')]),
        ),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{note}</DialogDescription>
        </DialogHeader>
        <form className="profile-edit-dialog__form" onSubmit={submit}>
          {fields.map((field) => (
            <div key={field.name} className="profile-edit-dialog__field">
              {field.multiline ? (
                <Textarea
                  id={`edit-${field.name}`}
                  placeholder={field.label}
                  value={values[field.name] ?? ''}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                />
              ) : (
                <Input
                  id={`edit-${field.name}`}
                  type={field.type ?? 'text'}
                  label={field.label}
                  requiredMark={field.required}
                  value={values[field.name] ?? ''}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                />
              )}
              {errors[field.name] ? (
                <p className="page-primitive__error">{errors[field.name]}</p>
              ) : null}
            </div>
          ))}
          <div className="profile-edit-dialog__actions">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
