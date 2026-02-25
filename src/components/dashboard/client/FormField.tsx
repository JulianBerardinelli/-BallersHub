import { TextareaHTMLAttributes, InputHTMLAttributes } from "react";

type BaseProps = {
  id: string;
  label: string;
  description?: string;
  errorMessage?: string;
};

type InputProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "children"> & {
    as?: "input";
  };

type TextareaProps = BaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "children"> & {
    as: "textarea";
  };

type FormFieldProps = InputProps | TextareaProps;

export default function FormField(props: FormFieldProps) {
  const { id, label, description, errorMessage, ...restProps } = props;
  const sharedClassName =
    "w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-700 disabled:cursor-not-allowed disabled:opacity-60";

  const { as, ...rest } = restProps as ({ as?: string } & Record<string, unknown>);

  if (as === "textarea") {
    const { readOnly, className, ...textareaRest } = rest as Omit<TextareaProps, "id" | "label" | "description">;
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-sm font-medium text-neutral-200">
          {label}
        </label>
        <textarea
          {...(textareaRest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          id={id}
          className={className ? `${sharedClassName} ${className}` : sharedClassName}
          readOnly={readOnly ?? true}
        />
        {errorMessage ? <p className="text-xs text-red-400">{errorMessage}</p> : null}
        {description ? <p className="text-xs text-neutral-500">{description}</p> : null}
      </div>
    );
  }

  const { type, readOnly, className, ...inputRest } = rest as Omit<InputProps, "id" | "label" | "description">;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-200">
        {label}
      </label>
      <input
        {...(inputRest as InputHTMLAttributes<HTMLInputElement>)}
        type={type ?? "text"}
        id={id}
        className={className ? `${sharedClassName} ${className}` : sharedClassName}
        readOnly={readOnly ?? true}
      />
      {errorMessage ? <p className="text-xs text-red-400">{errorMessage}</p> : null}
      {description ? <p className="text-xs text-neutral-500">{description}</p> : null}
    </div>
  );
}
