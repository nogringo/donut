import NDK, { getRelayListForUser } from "@nostr-dev-kit/ndk";

export async function getRecipientNutzapSettings(ndk: NDK, recipientPubkey: string) {
    const nutzapRecommandationEvent = await ndk.fetchEvent({
        kinds: [10019],
        authors: [recipientPubkey],
    });

    let recipientNutzapSettings = {
        relays: (await getRelayListForUser(recipientPubkey, ndk)).relays,
        pubkey: `02${recipientPubkey}`,
    }

    if (nutzapRecommandationEvent) {
        recipientNutzapSettings = {
            relays: nutzapRecommandationEvent.getMatchingTags("relay").map(tag => tag[1]),
            pubkey: nutzapRecommandationEvent.getMatchingTags("pubkey").map(tag => tag[1])[0],
        }
    }

    return recipientNutzapSettings;
}