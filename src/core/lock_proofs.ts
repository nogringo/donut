import type { CashuWallet, Proof } from "@cashu/cashu-ts";

//! Shity function but it work
export async function lockProofs(wallet: CashuWallet, mintUrl: string, proofs: Proof[], pubkey: string, locktime: number, refundKey: string) {
    try {
        const receivedProofs = await wallet.receive({ proofs: proofs, mint: mintUrl }, {p2pk: {pubkey, locktime, refundKeys: [refundKey]}});
        return await lockProofs(wallet, mintUrl, receivedProofs, pubkey, locktime, refundKey);
    } catch (error) {
        return proofs;
    }
}