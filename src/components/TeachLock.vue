<template>
  <div class="teach-view">
    <div class="page-head">
      <h1>Teach signs</h1>
      <p class="muted">Teaching is limited to reviewers. Enter the Teach password to continue.</p>
    </div>
    <form v-if="!unconfigured" class="panel lock" @submit.prevent="submit">
      <label class="field">Password
        <input ref="pw" v-model="password" type="password" autocomplete="current-password" :aria-invalid="wrong" :disabled="busy" />
      </label>
      <p v-if="wrong" class="err-text" role="alert">Wrong password — try again.</p>
      <button class="btn primary" :disabled="!password || busy">{{ busy ? 'Checking…' : '🔓 Unlock' }}</button>
    </form>
    <p v-else class="panel lock err-text" role="alert">
      Teach is disabled: this build has no password set. Add <code>VITE_TEACH_PASSWORD_HASH</code> to the site's environment
      variables and redeploy.
    </p>
  </div>
</template>

<script>
import { checkTeachPassword, TEACH_LOCK } from '../lib/teachLock';

export default {
  name: 'TeachLock',
  emits: ['unlock'],
  data() {
    return { password: '', wrong: false, busy: false, unconfigured: TEACH_LOCK === 'unconfigured' };
  },
  mounted() {
    this.$refs.pw?.focus();
  },
  methods: {
    async submit() {
      this.busy = true;
      const ok = await checkTeachPassword(this.password);
      this.busy = false;
      if (ok) return this.$emit('unlock');
      this.wrong = true;
      this.password = '';
      this.$nextTick(() => this.$refs.pw?.focus());
    },
  },
};
</script>
