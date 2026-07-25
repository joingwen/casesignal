-- Spreadsheet extracts may begin partway through a register. `row_offset` is the
-- register row number of the first stored data row, so the row numbers shown in
-- the source viewer match the row numbers used in citations
-- (e.g. `Sheet "Invoices," row 221`) even when only an extract is held.
ALTER TABLE "source_sheets" ADD COLUMN "row_offset" integer DEFAULT 1 NOT NULL;
