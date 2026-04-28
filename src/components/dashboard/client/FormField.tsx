import * as React from "react";
import type { TextareaHTMLAttributes, InputHTMLAttributes } from "react";
import { forwardRef } from "react";

type BaseProps = {
  id?: string;
  label?: string;
  description?: string;
  errorMessage?: string;
  isInvalid?: boolean;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  isRequired?: boolean;
  /** HeroUI-compat: receives only the new string value. */
  onValueChange?: (value: string) => void;
};

type InputProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "children"> & {
    as?: "input";
  };

type TextareaProps = BaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "children"> & {
    as: "textarea";
  };

export type FormFieldProps = InputProps | TextareaProps;

const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2";
const descriptionClass = "text-[11px] text-bh-fg-4";
const errorClass = "text-[11px] text-bh-danger";

const baseFieldClass =
  "w-full bg-transparent text-[14px] text-bh-fg-1 placeholder:text-bh-fg-4 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 read-only:cursor-default";

function wrapperClass(invalid: boolean, hasStart: boolean, hasEnd: boolean) {
  return [
    "flex items-center gap-2 rounded-bh-md border bg-bh-surface-1 transition-colors duration-150",
    "focus-within:ring-1 focus-within:ring-bh-lime/30",
    invalid
      ? "border-bh-danger focus-within:border-bh-danger focus-within:ring-bh-danger/30"
      : "border-white/[0.08] hover:border-white/[0.18] focus-within:border-bh-lime",
    hasStart || hasEnd ? "px-3" : "px-3",
    "py-2",
  ].join(" ");
}

const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormFieldProps>(
  (props, ref) => {
    const {
      id,
      label,
      description,
      errorMessage,
      isInvalid,
      startContent,
      endContent,
      isRequired,
      onValueChange,
      ...restProps
    } = props;
    // Only the explicit isInvalid flag toggles the red state; errorMessage
    // is just descriptive copy that we render *when* invalid.
    const invalid = !!isInvalid;

    const { as, ...rest } = restProps as ({ as?: string } & Record<string, unknown>);

    if (as === "textarea") {
      const { className, onChange: textareaOnChange, ...textareaRest } = rest as Omit<
        TextareaProps,
        "id" | "label" | "description"
      >;
      const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        textareaOnChange?.(e);
        onValueChange?.(e.target.value);
      };
      return (
        <div className="space-y-1.5">
          {label ? (
            <label htmlFor={id} className={labelClass}>
              {label}
              {isRequired ? <span className="text-bh-danger"> *</span> : null}
            </label>
          ) : null}
          <div
            className={[
              "rounded-bh-md border bg-bh-surface-1 transition-colors duration-150",
              "focus-within:ring-1 focus-within:ring-bh-lime/30",
              invalid
                ? "border-bh-danger focus-within:border-bh-danger"
                : "border-white/[0.08] hover:border-white/[0.18] focus-within:border-bh-lime",
            ].join(" ")}
          >
            <textarea
              {...(textareaRest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
              onChange={handleTextareaChange}
              id={id}
              className={`${baseFieldClass} px-3 py-2 ${className ?? ""}`}
              ref={ref as React.Ref<HTMLTextAreaElement>}
            />
          </div>
          {invalid && errorMessage ? <p className={errorClass}>{errorMessage}</p> : null}
          {description ? <p className={descriptionClass}>{description}</p> : null}
        </div>
      );
    }

    const { type, className, onChange: inputOnChange, ...inputRest } = rest as Omit<
      InputProps,
      "id" | "label" | "description"
    >;
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      inputOnChange?.(e);
      onValueChange?.(e.target.value);
    };

    return (
      <div className="space-y-1.5">
        {label ? (
          <label htmlFor={id} className={labelClass}>
            {label}
            {isRequired ? <span className="text-bh-danger"> *</span> : null}
          </label>
        ) : null}
        <div className={wrapperClass(invalid, !!startContent, !!endContent)}>
          {startContent ? (
            <span className="flex shrink-0 items-center text-bh-fg-3">{startContent}</span>
          ) : null}
          <input
            {...(inputRest as InputHTMLAttributes<HTMLInputElement>)}
            onChange={handleInputChange}
            type={type ?? "text"}
            id={id}
            className={`${baseFieldClass} ${className ?? ""}`}
            ref={ref as React.Ref<HTMLInputElement>}
          />
          {endContent ? (
            <span className="flex shrink-0 items-center text-bh-fg-3">{endContent}</span>
          ) : null}
        </div>
        {invalid && errorMessage ? <p className={errorClass}>{errorMessage}</p> : null}
        {description ? <p className={descriptionClass}>{description}</p> : null}
      </div>
    );
  },
);

FormField.displayName = "FormField";

export default FormField;
