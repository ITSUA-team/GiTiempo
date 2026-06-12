<template>
  <div class="bg-app-bg text-text-dark min-h-screen">
    <div class="mx-auto flex min-h-screen max-w-[1280px] flex-col lg:flex-row">
      <slot name="left" />
      <slot name="right" />
    </div>
  </div>
</template>
