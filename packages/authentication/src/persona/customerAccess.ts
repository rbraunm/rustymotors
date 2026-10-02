import { getLogContext } from "@rustymotors/logging";
import { databaseProvider } from "rusty-motors-shared";

/**
 * Whether a persona request for this customer comes from the address its session logged in
 * from. The persona port's requests carry a customer id and nothing that proves it.
 */
export function isRequestFromCustomer(customerId: number): boolean {
	const remoteAddress = getLogContext()?.remoteAddress;
	if (typeof remoteAddress === "undefined") {
		throw new Error("The persona request's connection has no remote address");
	}
	return databaseProvider.getAuthStore().findSessionAddress(customerId) === remoteAddress;
}
