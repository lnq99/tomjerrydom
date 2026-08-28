import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260828014058 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "storefront_media_item" ("id" text not null, "section" text not null, "type" text not null, "url" text not null, "title" text null, "position" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "storefront_media_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_storefront_media_item_deleted_at" ON "storefront_media_item" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "storefront_media_item" cascade;`);
  }

}
