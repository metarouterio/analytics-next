import { Context, Integrations, LegacySettings } from '..'

// FIXME: Import these types directly from `@segment/inspector-core`
type SegmentEvent = object
type Inspector = {
  start: (config: object) => void
  trace: (eventPhase: object) => void
}

export const inspectorHost = (() => {
  let inspector: Inspector
  let integrationNames: string[]

  const now = () => new Date().toISOString()
  const getValue = (key: string) =>
    JSON.parse(localStorage.getItem(key) || 'null')
  const resolveDestinations = (integrations: Integrations) =>
    integrationNames?.filter((integration) =>
      typeof integrations?.[integration] === 'boolean'
        ? integrations[integration]
        : integrations?.All ?? true
    )

  return {
    connectInspector: (inspectorClient: Inspector) => {
      try {
        inspectorClient.start({
          user: {
            id: getValue('ajs_user_id'),
            traits: getValue('ajs_user_traits'),
          },
        })
        inspector = inspectorClient
      } catch (error) {
        console.warn(
          `Inspector start up failed - ${(error as Error).toString()}`
        )
      }
    },
    setIntegrations: (integrations: LegacySettings['integrations']) => {
      integrationNames = Object.keys(integrations)
    },
    reportTriggered: (ctx: Context) =>
      inspector?.trace({
        id: ctx.id,
        stage: 'triggered',
        event: ctx.event as SegmentEvent,
        timestamp: now(),
      }),
    reportDelivered: (ctx: Context) => {
      if (!integrationNames) {
        console.warn(
          'Inspector host unaware of integrations cannot resolve destinations'
        )
      }

      inspector?.trace({
        id: ctx.id,
        stage: 'delivered',
        event: ctx.event as SegmentEvent,
        timestamp: now(),
        destinations: resolveDestinations(ctx.event.integrations || {}) || [],
      })
    },
  }
})()
