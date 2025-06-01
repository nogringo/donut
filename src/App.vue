<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { getDecodedToken } from '@cashu/cashu-ts';;
import NDK, { NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { onLikeEvent } from "./core/on_like_event.ts";

function usePersistentRef<T>(key: string, defaultValue: T) {
  const stored = localStorage.getItem(key);
  const r = ref<T>(stored !== null ? JSON.parse(stored) : defaultValue);
  watch(r, val => localStorage.setItem(key, JSON.stringify(val)), { deep: true });
  return r;
}

const encodedWalletToken = usePersistentRef<string>('walletToken', '');
const nsec = usePersistentRef<string>('nsec', '');
const nutzapAmount = usePersistentRef<number>('nutzapAmount', 1);
const nutzapMessage = usePersistentRef<string>('nutzapMessage', 'Nutzap !');
const cashuTokenHistory = usePersistentRef<string[]>('cashuTokenHistory', []);

const balance = computed(() => {
  if (!encodedWalletToken.value.startsWith("cashu")) return 0;
  const walletToken = getDecodedToken(encodedWalletToken.value);
  const amount = walletToken.proofs.reduce((acc, proof) => acc + proof.amount, 0);
  return amount;
});

const isLoading = ref(false);
const totalNutzapToDo = ref(0);
const totalNutzapDone = ref(0);

async function handleNutzapClick() {
  isLoading.value = true;

  const signer = new NDKPrivateKeySigner(nsec.value);

  const ndk = new NDK({
    signer,
    explicitRelayUrls: [
      "wss://relay.damus.io",
      "wss://relay.primal.net",
      "wss://nos.lol",
      "wss://purplepag.es",
    ],
  });
  await ndk.connect();

  const user = ndk.activeUser;

  if (!user) {
    isLoading.value = false;
    throw new Error("NDK activeUser is undefined. Please check your NDK setup.");
  }

  const lastNutzapEvent = await ndk.fetchEvent({
    kinds: [9321],
    authors: [user.pubkey],
  });

  const unzappedLikeEvents = await ndk.fetchEvents({
    kinds: [7],
    authors: [user.pubkey],
    since: lastNutzapEvent?.created_at,
    limit: 100,
  });

  totalNutzapToDo.value = unzappedLikeEvents.size;
  totalNutzapDone.value = 0;
  for (const likeEvent of unzappedLikeEvents) {
    const zapDone = await onLikeEvent(likeEvent, ndk, nutzapAmount.value, 7 * 3600, nutzapMessage.value, encodedWalletToken, cashuTokenHistory);
    if (!zapDone) break;
    totalNutzapDone.value++;
  }

  isLoading.value = false;
}
</script>

<template>
  <div class="container">
    <h1>Donut</h1>
    <div class="balance">
      <span>Balance:</span>
      <strong>{{ balance }} sat{{ balance > 1 ? "s" : "" }}</strong>
    </div>
    <div class="form">
      <label>
        Wallet:
        <input type="text" v-model="encodedWalletToken" placeholder="Entrez votre token Cashu" />
      </label>
      <label>
        Nsec:
        <input type="password" v-model="nsec" placeholder="Entrez votre nsec" />
      </label>
      <label>
        NutZap amount:
        <input type="number" v-model="nutzapAmount" placeholder="Montant" min="1" />
      </label>
      <label>
        NutZap message:
        <input type="text" v-model="nutzapMessage" placeholder="Message" />
      </label>
      <button class="send-btn" :disabled="!encodedWalletToken || !nsec || !nutzapAmount || isLoading"
        @click="handleNutzapClick">Nutzap !</button>
    </div>
    <div v-if="isLoading" class="progress">
      Progression : {{ totalNutzapDone }} / {{ totalNutzapToDo }}
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.07);
  font-family: system-ui, sans-serif;
  box-sizing: border-box;
}

h1 {
  text-align: center;
  margin-bottom: 1.5rem;
}

.balance {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f6f6f6;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 1rem;
  font-weight: 500;
  width: 100%;
  box-sizing: border-box;
}

.form input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 0.5rem;
  margin-top: 0.25rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  background: #fafafa;
}

.send-btn {
  width: 100%;
  padding: 0.75rem;
  background: #ffb300;
  color: #222;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  margin-top: 1rem;
  transition: background 0.2s;
}

.send-btn:disabled {
  background: #ffe082;
  cursor: not-allowed;
}

.progress {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 1.1rem;
  color: #ff9800;
  font-weight: bold;
}
</style>
