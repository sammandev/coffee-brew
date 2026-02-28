"use client";

import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectOptionItem {
	disabled: boolean;
	label: React.ReactNode;
	value: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "multiple" | "size"> {
	menuAlign?: "start" | "end";
	menuClassName?: string;
	showIndicator?: boolean;
}

function toOptionItems(children: React.ReactNode): SelectOptionItem[] {
	return React.Children.toArray(children)
		.map((child) => {
			if (!React.isValidElement(child) || child.type !== "option") return null;
			const optionElement = child as React.ReactElement<{
				children?: React.ReactNode;
				disabled?: boolean;
				value?: string | number;
			}>;

			const valueProp = optionElement.props.value;
			const value = valueProp === undefined ? String(optionElement.props.children ?? "") : String(valueProp);

			return {
				value,
				label: optionElement.props.children,
				disabled: Boolean(optionElement.props.disabled),
			} satisfies SelectOptionItem;
		})
		.filter((item): item is SelectOptionItem => Boolean(item));
}

export function Select({
	children,
	className,
	defaultValue,
	disabled = false,
	id,
	menuAlign = "start",
	menuClassName,
	name,
	onChange,
	showIndicator = true,
	value,
}: SelectProps) {
	const wrapperRef = React.useRef<HTMLDivElement>(null);
	const triggerRef = React.useRef<HTMLButtonElement>(null);
	const [isOpen, setIsOpen] = React.useState(false);
	const options = React.useMemo(() => toOptionItems(children), [children]);

	const initialValue = React.useMemo(() => {
		if (value !== undefined) return String(value);
		if (defaultValue !== undefined) return String(defaultValue);
		return options.find((option) => !option.disabled)?.value ?? "";
	}, [defaultValue, options, value]);

	const isControlled = value !== undefined;
	const [internalValue, setInternalValue] = React.useState(initialValue);

	React.useEffect(() => {
		if (!isControlled) {
			setInternalValue(initialValue);
		}
	}, [initialValue, isControlled]);

	React.useEffect(() => {
		if (!isOpen) return;

		function handleOutsideClick(event: MouseEvent) {
			if (!wrapperRef.current?.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		function handleEscape(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsOpen(false);
				triggerRef.current?.focus();
			}
		}

		document.addEventListener("mousedown", handleOutsideClick);
		document.addEventListener("keydown", handleEscape);

		return () => {
			document.removeEventListener("mousedown", handleOutsideClick);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen]);

	const selectedValue = isControlled ? String(value ?? "") : internalValue;
	const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];

	function emitChange(nextValue: string) {
		onChange?.({
			currentTarget: {
				name: name ?? "",
				value: nextValue,
			},
			target: {
				name: name ?? "",
				value: nextValue,
			},
		} as React.ChangeEvent<HTMLSelectElement>);
	}

	function chooseOption(nextValue: string) {
		if (disabled) return;

		if (!isControlled) {
			setInternalValue(nextValue);
		}

		emitChange(nextValue);
		setIsOpen(false);
		triggerRef.current?.focus();
	}

	return (
		<div ref={wrapperRef} className="relative">
			{name && <input type="hidden" name={name} value={selectedValue} />}
			<button
				ref={triggerRef}
				id={id}
				type="button"
				disabled={disabled}
				onClick={() => setIsOpen((current) => !current)}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				className={cn(
					"inline-flex h-11 w-full items-center rounded-xl border bg-(--surface) px-3 text-left text-sm text-foreground transition hover:border-(--accent)/55 focus:outline-none focus:ring-2 focus:ring-(--accent)/25 disabled:cursor-not-allowed disabled:opacity-55",
					showIndicator ? "justify-between gap-2" : "justify-center gap-0",
					className,
				)}
			>
				<span className="truncate">{selectedOption?.label ?? ""}</span>
				{showIndicator ? <ChevronDown size={14} className={cn("shrink-0 transition", isOpen && "rotate-180")} /> : null}
			</button>

			{isOpen && (
				<div
					className={cn(
						"absolute top-[calc(100%+0.35rem)] z-50 min-w-full w-max rounded-xl border bg-(--surface-elevated) p-1",
						menuAlign === "end" ? "right-0" : "left-0",
						menuClassName,
					)}
				>
					<ul aria-labelledby={id} className="grid gap-0.5">
						{options.map((option) => {
							const isSelected = option.value === selectedValue;

							return (
								<li key={option.value}>
									<button
										type="button"
										aria-pressed={isSelected}
										disabled={option.disabled}
										onClick={() => chooseOption(option.value)}
										className={cn(
											"flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-foreground transition hover:bg-(--sand)/18 disabled:cursor-not-allowed disabled:opacity-50",
											isSelected && "bg-(--sand)/22",
										)}
									>
										<span>{option.label}</span>
										{isSelected ? <Check size={14} className="shrink-0 text-(--accent)" /> : null}
									</button>
								</li>
							);
						})}
					</ul>
				</div>
			)}
		</div>
	);
}
