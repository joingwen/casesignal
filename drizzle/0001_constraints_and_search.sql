-- CaseSignal: evidentiary constraints and full-text retrieval.
--
-- Status vocabularies are enforced by the database so an invalid claim status
-- or processing state can never be persisted, regardless of the code path.
-- Full-text search is the mandatory retrieval fallback and is always present;
-- semantic retrieval (Voyage embeddings) layers on top when configured.

ALTER TABLE "claims" ADD CONSTRAINT "claims_status_check"
  CHECK ("status" IN ('supported','partially_supported','contradicted','unresolved','context_only'));
--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_review_state_check"
  CHECK ("review_state" IN ('unreviewed','reviewed','approved','needs_follow_up'));
--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_materiality_check"
  CHECK ("materiality" IN ('low','medium','high'));
--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_confidence_check"
  CHECK ("confidence" >= 0 AND "confidence" <= 1);
--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_role_check"
  CHECK ("role" IN ('supporting','contradicting','context'));
--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_status_check"
  CHECK ("status" IN ('queued','extracting','indexing','analyzing','complete','needs_review','failed'));
--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_kind_check"
  CHECK ("kind" IN ('file','url','note','paste'));
--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_format_check"
  CHECK ("format" IN ('pdf','docx','txt','markdown','csv','xlsx','image','html','note'));
--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_precision_check"
  CHECK ("precision" IN ('exact','estimated','range','conflicting'));
--> statement-breakpoint
ALTER TABLE "discrepancies" ADD CONSTRAINT "discrepancies_type_check"
  CHECK ("type" IN ('date','time','amount','count','name','title','location','procedure','status','sequence'));
--> statement-breakpoint
ALTER TABLE "discrepancy_evidence" ADD CONSTRAINT "discrepancy_evidence_side_check"
  CHECK ("side" IN ('a','b'));
--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_type_check"
  CHECK ("type" IN ('person','organization','document','event','location','transaction','asset','other'));
--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_type_check"
  CHECK ("type" IN ('supports','contradicts','mentions','authored_by','sent_to','paid','occurred_at','precedes','related_to'));
--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_distinct_check"
  CHECK ("from_entity_id" <> "to_entity_id");
--> statement-breakpoint
ALTER TABLE "case_messages" ADD CONSTRAINT "case_messages_role_check"
  CHECK ("role" IN ('user','assistant','system'));
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_check"
  CHECK ("plan" IN ('free','pro'));
--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_status_check"
  CHECK ("status" IN ('active','archived'));
--> statement-breakpoint

-- Full-text retrieval over every traceable excerpt.
ALTER TABLE "source_chunks"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("text", ''))) STORED;
--> statement-breakpoint
CREATE INDEX "source_chunks_search_idx" ON "source_chunks" USING gin ("search_vector");
--> statement-breakpoint
CREATE INDEX "source_chunks_case_page_idx" ON "source_chunks" ("case_id", "source_id", "page_number");
--> statement-breakpoint

-- Claim and source titles are searched from the command palette.
CREATE INDEX "claims_search_idx" ON "claims" USING gin (to_tsvector('english', coalesce("statement", '')));
--> statement-breakpoint
CREATE INDEX "sources_search_idx" ON "sources" USING gin (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("summary", '')));
