"use client";

import {
  createContext,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type FormHTMLAttributes,
  type ReactNode,
} from "react";
import { LoaderCircle } from "lucide-react";

type ActionFormContextValue = {
  pending: boolean;
};

const ActionFormContext = createContext<ActionFormContextValue>({
  pending: false,
});

type ActionFormProps = FormHTMLAttributes<HTMLFormElement> & {
  children: ReactNode;
};

export function ActionForm({ children, onSubmit, ...props }: ActionFormProps) {
  const [pending, setPending] = useState(false);

  return (
    <ActionFormContext.Provider value={{ pending }}>
      <form
        {...props}
        aria-busy={pending}
        data-action-pending={pending ? "true" : "false"}
        onSubmit={(event) => {
          onSubmit?.(event);
          if (!event.defaultPrevented) {
            setPending(true);
          }
        }}
      >
        {children}
      </form>
    </ActionFormContext.Provider>
  );
}

type ActionSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
  children: ReactNode;
};

export function ActionSubmitButton({
  pendingLabel = "Wird gespeichert…",
  children,
  disabled,
  className = "",
  ...props
}: ActionSubmitButtonProps) {
  const { pending } = useContext(ActionFormContext);
  const isDisabled = disabled || pending;

  return (
    <button
      {...props}
      type={props.type ?? "submit"}
      disabled={isDisabled}
      aria-busy={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-65`}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{pendingLabel}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
