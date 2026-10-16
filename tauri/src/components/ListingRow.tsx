import { memo } from "react";

import { FunctionHeader } from "@/components/FunctionHeader";
import { DisasmComment, DisasmInstr, splitComment } from "@/lib/disasm";
import { fmtAddr } from "@/lib/listingFormat";
import { cn } from "@/lib/utils";
import type { Function, ListingRow } from "@/types";

/**
 * Group a hex byte string into space-separated pairs, the way Ghidra shows
 * instruction and data bytes: `0f4c3b` becomes `0f 4c 3b`.
 *
 * @param hex - The packed hex string, or null.
 * @returns The bytes separated by single spaces.
 *
 * @example
 * groupBytes("0f4c3b") // => "0f 4c 3b"
 * groupBytes(null)     // => ""
 */
function groupBytes(hex?: string | null): string {
	if (!hex) return "";
	return hex.match(/.{1,2}/g)?.join(" ") ?? "";
}

/**
 * One row of the listing: a section header, a disassembled instruction, or a
 * run of data bytes.
 *
 * The row is a fixed height by construction, which is what lets the window
 * place it from a single estimate with no runtime measurement: a listed
 * instruction is one line, whose bytes grow the byte column to the right
 * instead of wrapping onto a second line. A variable height would make the
 * measured size disagree with the estimate, and each disagreement shifts every
 * row below the measured one while the analyst is scrolling.
 *
 * @param props.row - The row to render.
 * @param props.func - Name of the function starting at this row, if any.
 * @param props.active - Whether this row's address is selected.
 * @param props.onGoTo - Called when a named function row is activated.
 * @param props.onSelect - Called with the row's address when it is clicked.
 * @returns The row element.
 */
export const ListingRowView = memo(function ListingRowView({
	row,
	func,
	active,
	onGoTo,
	onSelect,
}: {
	row: ListingRow;
	func?: Function | null;
	active: boolean;
	onGoTo?: (f: Function) => void;
	onSelect?: (addr: number) => void;
}) {
	if (row.kind === "header") {
		return (
			<div className="border-border bg-muted/40 text-asm-number flex h-[18px] items-center border-y px-3 font-mono text-[11px] font-semibold">
				{row.label ?? "section"}
			</div>
		);
	}

	const text = row.text ?? "";
	const { instr, comment } =
		row.kind === "code" ? splitComment(text) : { instr: "", comment: "" };

	return (
		<>
			{/* A function opens a region of the listing, marked the way Ghidra
			    marks it: blank space, the boxed FUNCTION banner, the signature
			    and its parameter/local storage, then the code. All as `;`
			    comments, so it reads as a header and not as either a section
			    band or an instruction. */}
			{func && <FunctionHeader func={func} onGoTo={onGoTo} />}
			<div
				className={cn(
					"flex h-[18px] min-w-max items-center gap-3 py-px pl-3 font-mono whitespace-nowrap",
					active && "ui-selected border-brand border-l-2 pl-[10px]",
					"hover:bg-accent/70 cursor-pointer",
				)}
				onClick={() => onSelect?.(row.addr)}
				title={
					row.kind === "code" ? "Select instruction" : "Select data"
				}
			>
				<span className="text-asm-addr w-[19ch] shrink-0">
					{fmtAddr(row.addr)}
				</span>
				{/* `min-w` keeps every instruction column aligned, while a long
				    instruction's bytes widen only this row rather than pushing
				    the instruction to a different x on every other row. */}
				<span className="text-asm-bytes min-w-[26ch] shrink-0 pr-3">
					{groupBytes(row.bytes)}
				</span>
				{row.kind === "code" ? (
					<span className="text-foreground">
						<DisasmInstr text={instr} />
						<DisasmComment comment={comment} />
						{typeof row.jump === "number" && (
							<span className="text-asm-jump">
								{" "}
								→ {fmtAddr(row.jump)}
							</span>
						)}
					</span>
				) : (
					<span className="text-asm-string">{text}</span>
				)}
			</div>
		</>
	);
});
