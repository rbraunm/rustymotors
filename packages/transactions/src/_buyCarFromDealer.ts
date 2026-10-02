import { OldServerMessage, databaseProvider, getServerLogger } from "rusty-motors-shared";
import { GenericReplyMessage } from "./GenericReplyMessage.js";
import { PurchaseStockCarMessage } from "./PurchaseStockCarMessage.js";
import type { MessageHandlerArgs, MessageHandlerResult } from "./handlers.js";
import { connectionPersonaId, failedReply } from "./personaConnection.js";
import { findStarterCar } from "./starterCars.js";

const defaultLogger = getServerLogger("handlers/_buyCarFromDealer");

const MC_SUCCESS = 101;

/**
 * Handle MC_PURCHASE_STOCK_CAR (142): the connection's persona buys a dealer's stock car at the
 * dealer's price. The reply carries the new car's id; MC_FAILED when the bank cannot cover the price.
 */
export async function _buyCarFromDealer({
	connectionId,
	packet,
	log = defaultLogger,
}: MessageHandlerArgs): Promise<MessageHandlerResult> {
	const request = new PurchaseStockCarMessage();
	request.deserialize(packet.serialize());
	if (request.tradeInCarId !== 0) {
		throw new Error(`MC_PURCHASE_STOCK_CAR trades in car ${request.tradeInCarId}; trade-ins are not supported`);
	}
	const offer = findStarterCar(request.dealerId, request.brandedPardId);
	const personaId = connectionPersonaId(connectionId);

	const carId = await databaseProvider
		.getGameDataStore()
		.purchaseStockCar(personaId, offer.brandedPartId, request.skinId, offer.price);
	if (typeof carId === "undefined") {
		log.info(`Persona ${personaId} cannot afford branded part ${offer.brandedPartId} at ${offer.price}`);
		return { connectionId, messages: [failedReply(packet)] };
	}

	const reply = new GenericReplyMessage();
	reply.msgNo = MC_SUCCESS;
	reply.msgReply = 142;
	reply.result.writeUInt32LE(MC_SUCCESS, 0);
	const carIdBuffer = Buffer.alloc(4);
	carIdBuffer.writeUInt32LE(carId, 0);
	reply.setData(carIdBuffer);

	const responsePacket = new OldServerMessage();
	responsePacket._header.sequence = packet.sequenceNumber;
	responsePacket._header.flags = 8;
	responsePacket.setBuffer(reply.serialize());
	return { connectionId, messages: [responsePacket] };
}
