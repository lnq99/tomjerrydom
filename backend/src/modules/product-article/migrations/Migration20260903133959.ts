import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260903133959 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_article" ("id" text not null, "product_id" text not null, "title" text null, "content" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_article_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_article_deleted_at" ON "product_article" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_article" cascade;`);
  }

}
