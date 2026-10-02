import { OldServerMessage, getServerLogger, starterCash } from "rusty-motors-shared";
import { GenericRequestMessage } from "./GenericRequestMessage.js";
import { StockCar } from "./StockCar.js";
import { StockCarInfoMessage } from "./StockCarInfoMessage.js";
import type { MessageHandlerArgs, MessageHandlerResult } from "./handlers.js";
import { starterBrandId, starterCars, starterDealerId } from "./starterCars.js";

const defaultLogger = getServerLogger("handlers/_getStockCarInfo");

/**
 * Handle MC_STOCK_CAR_INFO (141): a dealer's stock cars. The create dialog asks for the starter
 * dealer's before the persona exists, so the request carries the dealer and no persona.
 */
export async function _getStockCarInfo({
	connectionId,
	packet,
	log = defaultLogger,
}: MessageHandlerArgs): Promise<MessageHandlerResult> {
	const getStockCarInfoMessage = new GenericRequestMessage();
	getStockCarInfoMessage.deserialize(packet.data);
	const dealerId = getStockCarInfoMessage.data.readUInt32LE(0);
	if (dealerId !== starterDealerId) {
		throw new Error(`MC_STOCK_CAR_INFO for dealer ${dealerId}, which has no stock cars`);
	}

	const stockCarInfoMessage = new StockCarInfoMessage(starterCash, starterDealerId, starterBrandId);
	for (const car of starterCars) {
		stockCarInfoMessage.addStockCar(new StockCar(car.brandedPartId, car.price, car.isDealOfTheDay));
	}

	log.debug(`Sending Message: ${stockCarInfoMessage.toString()}`);

	const responsePacket = new OldServerMessage();
	responsePacket._header.sequence = packet.sequenceNumber;
	responsePacket._header.flags = 8;
	responsePacket.setBuffer(stockCarInfoMessage.serialize());
	return { connectionId, messages: [responsePacket] };
}
