import { NoResultsError, databaseProvider, type ServerLogger } from "rusty-motors-shared";

/** A live persona by its id (the client's GameUserId); deleted personas are not found. */
export async function getPersonaByPersonaId({
	personaId,
}: {
	personaId: number;
	logger?: ServerLogger;
}): Promise<{ customerId: number; personaId: number; personaName: string; shardId: number }> {
	const persona = await databaseProvider.getPersonaStore().findPersona(personaId);
	if (typeof persona === "undefined") {
		throw new NoResultsError(`Unable to locate a persona for id: ${personaId}`);
	}
	return {
		customerId: persona.customerId,
		personaId: persona.personaId,
		personaName: persona.name,
		shardId: persona.shardId,
	};
}
