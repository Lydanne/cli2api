<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import { useDashboardState } from "../lib/dashboard-state";

const { email, password, error, login, text } = useDashboardState();
</script>

<template>
  <section class="mx-auto flex min-h-screen max-w-md items-center px-4">
    <Card class="app-card w-full">
      <template #title>cli2api</template>
      <template #subtitle>{{ text("subtitle") }}</template>
      <template #content>
        <form class="space-y-4" @submit.prevent="login">
          <label class="block">
            <span class="app-field-label mb-1 block text-xs font-medium">{{ text("email") }}</span>
            <InputText v-model="email" class="w-full" data-testid="login-email" :placeholder="text('email')" />
          </label>
          <label class="block">
            <span class="app-field-label mb-1 block text-xs font-medium">{{ text("password") }}</span>
            <InputText
              v-model="password"
              class="w-full"
              data-testid="login-password"
              :placeholder="text('password')"
              type="password"
            />
          </label>
          <Button class="w-full" data-testid="login-submit" :label="text('login')" type="submit" />
          <Message v-if="error" severity="error" size="small">{{ error }}</Message>
        </form>
      </template>
    </Card>
  </section>
</template>
