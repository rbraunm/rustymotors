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
