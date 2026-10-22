import { createDelhivery } from "./shipping-delhivery";
import { createShiprocket } from "./shipping-shiprocket";
import {
  adminCarrierState,
  createMockProvider,
  fromFetch,
  unconfiguredProvider,
  type CarrierFetch,
  type ShippingConfig,
  type ShippingProvider
} from "./shipping";

/** Development without live keys uses the mock. Production never does. */
export function providerForEstimates(
  config: ShippingConfig,
  nodeEnv: string | undefined,
  fetchImpl?: CarrierFetch
): ShippingProvider {
  const state = adminCarrierState(config, nodeEnv);
  const network = fetchImpl ?? fromFetch(globalThis.fetch);
  if (state === "Shiprocket") {
    return createShiprocket({
      email: config.shiprocketEmail,
      password: config.shiprocketPassword,
      pickupPincode: config.pickup.pincode,
      webhookSecret: config.webhookSecret,
      fetchImpl: network
    });
  }
  if (state === "Delhivery") {
    return createDelhivery({
      token: config.delhiveryToken,
      pickupPincode: config.pickup.pincode,
      webhookSecret: config.webhookSecret,
      fetchImpl: network
    });
  }
  if (state === "Mock carrier") return createMockProvider(config.webhookSecret);
  return unconfiguredProvider(config.provider === "delhivery" ? "delhivery" : config.provider === "shiprocket" ? "shiprocket" : "mock");
}
