import { databaseProvider } from "rusty-motors-shared";

/** A stock car a dealer sells, at its price. */
export type StockCarOffer = {
	brandedPartId: number;
	price: number;
	isDealOfTheDay: boolean;
};

/** Scrappy's Junkyard: the dealer whose stock the create dialog offers as the starter car. */
export const starterDealerId = 8;
export const starterBrandId = 105;

export const starterCars: StockCarOffer[] = [
	{ brandedPartId: 113, price: 7394, isDealOfTheDay: false }, // '57 Chevrolet Bel-Air
	{ brandedPartId: 104, price: 6495, isDealOfTheDay: true }, // '57 Ford Fairlane
	{ brandedPartId: 402, price: 5995, isDealOfTheDay: false }, // '55 Buick Century
];

/** The dealer's offer of this car; throws when the dealer does not sell it. */
export function findStarterCar(dealerId: number, brandedPartId: number): StockCarOffer {
	const offer = dealerId === starterDealerId ? starterCars.find((car) => car.brandedPartId === brandedPartId) : undefined;
	if (typeof offer === "undefined") {
		throw new Error(`Dealer ${dealerId} does not sell branded part ${brandedPartId}`);
	}
	return offer;
}

/**
 * Buys the persona's starter car, which the MC_LOGIN after persona creation names (the create dialog's
 * BUY IT NOW sends no purchase of its own): only while the persona owns no car, so a login that names
 * it again buys nothing. The new car's id; undefined when the persona already has a car.
 */
export async function buyStarterCar(
	personaId: number,
	dealerId: number,
	brandedPartId: number,
	skinId: number,
): Promise<number | undefined> {
	const offer = findStarterCar(dealerId, brandedPartId);
	const player = await databaseProvider.getPersonaStore().findPlayer(personaId);
	if (typeof player === "undefined") {
		throw new Error(`There is no live persona ${personaId} to buy a starter car`);
	}
	if (player.carsOwned > 0) {
		return undefined;
	}
	const carId = await databaseProvider.getGameDataStore().purchaseStockCar(personaId, offer.brandedPartId, skinId, offer.price);
	if (typeof carId === "undefined") {
		throw new Error(`Persona ${personaId} cannot afford the starter car ${offer.brandedPartId} at ${offer.price}`);
	}
	return carId;
}
