---
name: glass-chart
description: Integrate reusable SVG line/area charts using the GlassChart component from `ui/components/GlassChart.vue`. Use this skill when the user asks to add a chart, graph, data visualization, or metric trend to any page or feature in the Facto project. Covers props, formatter patterns, mock data generation, and integration with filter controls.
---

# GlassChart Integration

`GlassChart` is a generic, reusable SVG line/area chart component living at `ui/components/GlassChart.vue`. It renders interactive charts with the Facto dark aesthetic (glow, gradients, tooltips) and is completely agnostic to the data domain.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `{ label: string; value: number }[]` | **required** | Array of data points to plot |
| `color` | `string` | `#00D4FF` | Line/glow/dot color (hex) |
| `height` | `number` | `300` | Chart height in px |
| `formatValue` | `(val: number) => string` | Compact K/M format | Custom tooltip value formatter |

## Basic Usage

```vue
<script setup lang="ts">
import GlassChart from '~/ui/components/GlassChart.vue'

const data = [
  { label: 'Mon', value: 1200 },
  { label: 'Tue', value: 1350 },
  { label: 'Wed', value: 1100 },
]
</script>

<template>
  <GlassChart :data="data" />
</template>
```

## Custom Value Formatter

Pass `formatValue` for domain-specific formatting (currency, percentages, users, etc.):

```ts
const currencyFmt = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    notation: val >= 1_000_000 ? 'compact' : 'standard'
  }).format(val)
```

```vue
<GlassChart :data="data" :format-value="currencyFmt" />
```

## Mock Data Generation Pattern

When real API data is unavailable, generate coherent simulated data with a single parametric function:

```ts
function generateSeries(days: number, baseVal: number) {
  const steps = Math.min(Math.max(days <= 7 ? days : Math.ceil(days / 7), 5), 12)
  return Array.from({ length: steps }, (_, idx) => {
    const dayOffset = Math.round(((steps - 1 - idx) / (steps - 1 || 1)) * days)
    const d = new Date()
    d.setDate(d.getDate() - dayOffset)
    const progress = idx / (steps - 1 || 1)
    const factor = 0.75 + progress * 0.22 + Math.sin(idx) * 0.03
    return {
      label: days <= 7
        ? d.toLocaleDateString('en-US', { weekday: 'short' })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(baseVal * factor)
    }
  })
}
```

Key design decisions:
- `steps` adapts to range: daily points for <=7d, weekly-ish for longer ranges, clamped between 5-12
- A single `days` parameter drives everything - no per-timeframe config objects
- `factor` creates a natural upward trend with minor oscillation via `Math.sin`

## Timeframe Filter Pattern

Map UI filter options to day counts with a simple Record:

```ts
type Timeframe = '7d' | '30d' | '60d' | 'all'
const TIMEFRAME_DAYS: Record<Timeframe, number> = { '7d': 7, '30d': 30, '60d': 60, 'all': 365 }
const activeTimeframe = ref<Timeframe>('30d')
```

Adding a new filter (e.g. `'90d'`) requires one line added to the Record and one button in the template.

## Reference Implementation

See `modules/visuals/components/SaasRevenueChart.vue` for a complete example that:
- Wraps `GlassChart` with metric + timeframe filter controls
- Passes a currency formatter via `formatValue`
- Generates mock MRR/Revenue series from a single `generateSeries` function
- Uses declarative arrays for filter buttons (`v-for` over `metrics[]` and `timeframes[]`)

## Architecture Notes

- `GlassChart` lives in `ui/components/` (global, reusable, data-agnostic)
- Domain-specific wrappers (filters, data fetching, formatters) live in `modules/<feature>/components/`
- SVG IDs use `useId()` to support multiple chart instances on the same page
- Grid lines are calculated proportionally from padding constants, not magic numbers
