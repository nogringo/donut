import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";
import { CashuMint, CashuWallet, getEncodedTokenV4, getDecodedToken } from '@cashu/cashu-ts';
import { lockProofs } from './lock_proofs.ts';
import { getRecipientNutzapSettings } from './get_recipient_nutzap_settings.ts';
import type { Ref } from "vue";

export async function onLikeEvent(likeEvent: NDKEvent, ndk: NDK, nutzapAmount: number, lockDuration: number, nutzapMessage: string, encodedWalletToken: Ref<string, string>, cashuTokenHistory: Ref<string[], string[]>) {
    const targetEventId = likeEvent.getMatchingTags("e")[0][1];
    const targetEventAuthor = likeEvent.getMatchingTags("p")[0][1];

    const recipientNutzapSettings = await getRecipientNutzapSettings(ndk, targetEventAuthor);

    const walletToken = getDecodedToken(encodedWalletToken.value);
    const walletBalance = walletToken.proofs.reduce((acc, proof) => acc + proof.amount, 0);
    const hasEnoughFunds = walletBalance > nutzapAmount;
    if (!hasEnoughFunds) {
        return false;
    }

    const mint = new CashuMint(walletToken.mint);
    const wallet = new CashuWallet(mint);
    await wallet.loadMint();

    const { keep, send } = await wallet.send(nutzapAmount, walletToken.proofs);

    const keepEncodedToken = getEncodedTokenV4({ mint: walletToken.mint, proofs: keep });
    console.log(keepEncodedToken);
    encodedWalletToken.value = keepEncodedToken;

    const lockedProofs = await lockProofs(wallet, walletToken.mint, send, recipientNutzapSettings.pubkey, Math.floor(Date.now() / 1000) + lockDuration, `02${ndk.activeUser!.pubkey}`);
    const sendEncodedToken = getEncodedTokenV4({ mint: walletToken.mint, proofs: lockedProofs });
    console.log(sendEncodedToken);
    cashuTokenHistory.value.push(sendEncodedToken);

    const nutzapEvent = new NDKEvent(ndk);
    nutzapEvent.kind = 9321;
    nutzapEvent.content = nutzapMessage;
    nutzapEvent.tags = [
        ...lockedProofs.map(proof => ["proof", JSON.stringify(proof)]),
        ["u", walletToken.mint],
        ["e", targetEventId],
        ["p", targetEventAuthor],
    ];
    await nutzapEvent.publish();

    return true;
}