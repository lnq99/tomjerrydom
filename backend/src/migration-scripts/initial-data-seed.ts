import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  logger.info("Seeding store infrastructure (Russia/RUB)...");

  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // Medusa auto-creates a "Default Sales Channel" on first migration — reuse it
  const { data: existingChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  let defaultSalesChannel = existingChannels[0] as { id: string; name: string };
  if (!defaultSalesChannel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [{ name: "Интернет-магазин", description: "Основной канал продаж" }],
      },
    });
    defaultSalesChannel = result[0];
  }
  logger.info(`  ✓ Sales channel: ${defaultSalesChannel.name} (${defaultSalesChannel.id})`);

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "Storefront",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel.id],
    },
  });
  logger.info(`  ✓ Publishable API key: ${publishableApiKey.token}`);

  await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "Tom Jerry Dom",
          supported_currencies: [
            {
              currency_code: "rub",
              is_default: true,
            },
          ],
          default_sales_channel_id: defaultSalesChannel.id,
        },
      ],
    },
  });
  logger.info("  ✓ Store created: Tom Jerry Dom (RUB)");

  await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Россия",
          currency_code: "rub",
          countries: ["ru"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  logger.info("  ✓ Region: Россия / RUB");

  const {
    result: [stockLocation],
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: "ТЯК Москва",
          address: {
            city: "Москва",
            country_code: "RU",
            address_1: "ТЯК Москва",
          },
        },
      ],
    },
  });

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel.id],
    },
  });
  logger.info(`  ✓ Stock location: ТЯК Москва (${stockLocation.id})`);

  logger.info("Seeding complete.");
  logger.info(`  Publishable API key token: ${publishableApiKey.token}`);
  logger.info(
    "  Copy to storefront/.env.local: NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=" +
      publishableApiKey.token
  );
}
