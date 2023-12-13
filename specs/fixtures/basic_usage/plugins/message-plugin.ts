import { defu } from 'defu'
import { defineNuxtPlugin, useNuxtApp, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin(
  nuxt => {
    // name: 'message-plugin',
    // enforce: 'pre', // or 'post'
    // setup(nuxt) {
    // nuxt.$config
    console.log(process.env.NODE_ENV, process.env.NODE_ENV === 'test', 'hello?')
    const nuxtApp = useNuxtApp()
    //  nuxt.hook('', () => {
    // if (
    //   // process.env.NODE_ENV === 'test'
    //   process.server
    // ) {
    process.on('message', (msg: string) => {
      console.log('child received:', typeof msg, msg)
      // const parsed = JSON.parse(msg) as { type: string; value: Record<string, unknown> }
      // console.log('trying to update runtimeConfig to:', defu(parsed.value, nuxt.$config))
      if (msg?.type === 'runtime-config') {
        console.log(process.env)
        process.env = defu(process.env, msg.value)
        console.log(process.env)
      }
    })
    // }
    //  })
    // console.log('hello from module')
    // nuxt.hook('')
    // console.log(process != null && process)
    // nuxtApp.hook('', () => {
    //   // const nuxtApp = useNuxtApp()
    // 	nuxtApp.hook('')
    //   // if (process.server) {
    //   //   process.send({
    //   //     type: 'runtime-config',
    //   //     value: { holo: 'worold' }
    //   //   })
    //   // }
    //   // do something in the hook
    // })
    // this is the equivalent of a normal functional plugin
  }
  // hooks: {
  //   // You can directly register Nuxt app runtime hooks here
  // }
  // env: {
  //   // Set this value to `false` if you don't want the plugin to run when rendering server-only or island components.
  //   islands: true
  // }
)
