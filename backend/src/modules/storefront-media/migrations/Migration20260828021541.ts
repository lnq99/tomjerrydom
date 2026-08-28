import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260828021541 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "storefront_media_item" add column if not exists "medusa_file_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "storefront_media_item" drop column if exists "medusa_file_id";`);
  }

}
