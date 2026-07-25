'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Building2,
  CircleDot,
  Coins,
  Download,
  FileText,
  Landmark,
  MapPin,
  Maximize2,
  Package,
  Quote,
  User,
} from 'lucide-react'

import {
  Button,
  ClaimStatusChip,
  EmptyState,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@/components/ui'
import {
  ENTITY_TYPE_LABELS,
  RELATIONSHIP_TYPE_LABELS,
  type ClaimStatus,
  type EntityType,
} from '@/lib/domain'
import type { GraphView } from '@/server/queries/case-detail'
import { cn, truncate } from '@/lib/utils'
import { usePrefersReducedMotion } from './workspace-context'

const INITIAL_NODE_CAP = 60

const KIND_FILTERS: { kind: 'entity' | 'claim' | 'source'; label: string }[] = [
  { kind: 'entity', label: 'Entities' },
  { kind: 'claim', label: 'Claims' },
  { kind: 'source', label: 'Records' },
]

const EDGE_COLOURS = {
  supports: '#3F76C5',
  contradicts: '#B4544C',
  other: '#C9C9C2',
} as const

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  person: User,
  organization: Building2,
  document: FileText,
  event: CircleDot,
  location: MapPin,
  transaction: Coins,
  asset: Package,
  other: Landmark,
}

interface NodeData extends Record<string, unknown> {
  label: string
  typeLabel: string
  kind: 'entity' | 'claim' | 'source'
  entityType: string
  status?: ClaimStatus
}

type FlowNode = Node<NodeData>

const CARD =
  'w-[160px] rounded-panel border border-line bg-canvas px-2 py-1.5 shadow-panel text-left'

function NodeShell({
  icon,
  title,
  typeLabel,
  children,
  selected,
}: {
  icon: React.ReactNode
  title: string
  typeLabel: string
  children?: React.ReactNode
  selected?: boolean
}) {
  return (
    <div className={cn(CARD, selected && 'border-evidence ring-2 ring-evidence/20')}>
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-1.5">
        <span className="text-ink-muted [&_svg]:size-3.5" aria-hidden="true">
          {icon}
        </span>
        <span className="truncate text-[12px] font-medium leading-snug text-ink">{title}</span>
      </div>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-muted">{typeLabel}</p>
      {children}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

function EntityNode({ data, selected }: NodeProps<FlowNode>) {
  const Icon = ENTITY_ICONS[data.entityType] ?? Landmark
  return (
    <NodeShell
      selected={selected}
      icon={<Icon />}
      title={truncate(data.label, 22)}
      typeLabel={data.typeLabel}
    />
  )
}

function SourceNode({ data, selected }: NodeProps<FlowNode>) {
  return (
    <NodeShell
      selected={selected}
      icon={<FileText />}
      title={truncate(data.label, 24)}
      typeLabel={data.typeLabel}
    />
  )
}

function ClaimNode({ data, selected }: NodeProps<FlowNode>) {
  return (
    <NodeShell
      selected={selected}
      icon={<Quote />}
      title={truncate(data.label, 34)}
      typeLabel={data.typeLabel}
    >
      {data.status ? (
        <div className="mt-1.5">
          <ClaimStatusChip status={data.status} size="sm" short />
        </div>
      ) : null}
    </NodeShell>
  )
}

const NODE_TYPES = { entity: EntityNode, source: SourceNode, claim: ClaimNode }

/** Deterministic, force-free radial layout: same input always yields same picture. */
function computeLayout(graph: GraphView): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  const rings: { kind: 'entity' | 'claim' | 'source'; radius: number; offset: number }[] = [
    { kind: 'entity', radius: 190, offset: 0 },
    { kind: 'source', radius: 400, offset: Math.PI / 12 },
    { kind: 'claim', radius: 620, offset: Math.PI / 6 },
  ]

  for (const ring of rings) {
    const members = graph.nodes.filter((node) => node.kind === ring.kind)
    members.forEach((node, index) => {
      if (node.x != null && node.y != null) {
        positions.set(node.id, { x: node.x, y: node.y })
        return
      }
      const angle = (index / Math.max(1, members.length)) * Math.PI * 2 + ring.offset
      positions.set(node.id, {
        x: Math.round(Math.cos(angle) * ring.radius),
        y: Math.round(Math.sin(angle) * ring.radius),
      })
    })
  }

  // Anything with an unexpected kind still gets a stable slot.
  graph.nodes.forEach((node, index) => {
    if (positions.has(node.id)) return
    const angle = (index / Math.max(1, graph.nodes.length)) * Math.PI * 2
    positions.set(node.id, {
      x: Math.round(Math.cos(angle) * 800),
      y: Math.round(Math.sin(angle) * 800),
    })
  })

  return positions
}

function edgeColour(type: string): string {
  if (type === 'supports') return EDGE_COLOURS.supports
  if (type === 'contradicts') return EDGE_COLOURS.contradicts
  return EDGE_COLOURS.other
}

/** Builds a self-contained SVG of the current view for export. */
function buildSvg(
  nodes: { id: string; label: string; typeLabel: string; x: number; y: number }[],
  edges: { source: string; target: string; type: string }[],
): string {
  const width = 160
  const height = 52
  const padding = 60
  const xs = nodes.map((node) => node.x)
  const ys = nodes.map((node) => node.y)
  const minX = Math.min(...xs, 0) - padding
  const minY = Math.min(...ys, 0) - padding
  const maxX = Math.max(...xs, 0) + width + padding
  const maxY = Math.max(...ys, 0) + height + padding
  const byId = new Map(nodes.map((node) => [node.id, node]))

  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const edgeMarkup = edges
    .map((edge) => {
      const from = byId.get(edge.source)
      const to = byId.get(edge.target)
      if (!from || !to) return ''
      const colour = edgeColour(edge.type)
      const dash = edge.type === 'contradicts' ? ' stroke-dasharray="6 4"' : ''
      return `<line x1="${from.x + width / 2}" y1="${from.y + height}" x2="${to.x + width / 2}" y2="${to.y}" stroke="${colour}" stroke-width="1.5"${dash} />`
    })
    .join('')

  const nodeMarkup = nodes
    .map(
      (node) =>
        `<g transform="translate(${node.x},${node.y})">` +
        `<rect width="${width}" height="${height}" rx="12" fill="#FFFFFF" stroke="#DFDFD9" />` +
        `<text x="10" y="22" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#111111">${escape(truncate(node.label, 22))}</text>` +
        `<text x="10" y="40" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#92928C">${escape(node.typeLabel.toUpperCase())}</text>` +
        `</g>`,
    )
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" width="${maxX - minX}" height="${maxY - minY}"><rect x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" fill="#F5F5F2" />${edgeMarkup}${nodeMarkup}</svg>`
}

export function GraphCanvas({ caseId, graph }: { caseId: string; graph: GraphView }) {
  const reducedMotion = usePrefersReducedMotion()

  // The accessible list view is the default when motion is reduced, until the
  // reader chooses otherwise. Derived, so the preference is never fought.
  const [listViewChoice, setListViewChoice] = React.useState<boolean | null>(null)
  const listView = listViewChoice ?? reducedMotion

  const [query, setQuery] = React.useState('')
  const [kinds, setKinds] = React.useState<Record<'entity' | 'claim' | 'source', boolean>>({
    entity: true,
    claim: true,
    source: true,
  })
  const [showAll, setShowAll] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [expandedIds, setExpandedIds] = React.useState<string[]>([])
  const [positions, setPositions] = React.useState<Record<string, { x: number; y: number }>>({})
  const [hoveredEdge, setHoveredEdge] = React.useState<string | null>(null)

  const layout = React.useMemo(() => computeLayout(graph), [graph])
  const nodeById = React.useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  )

  const neighbours = React.useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const edge of graph.edges) {
      if (!map.has(edge.source)) map.set(edge.source, new Set())
      if (!map.has(edge.target)) map.set(edge.target, new Set())
      map.get(edge.source)!.add(edge.target)
      map.get(edge.target)!.add(edge.source)
    }
    return map
  }, [graph.edges])

  /* --------------------------------------------------- which nodes show */
  const matching = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return graph.nodes.filter((node) => {
      if (!kinds[node.kind === 'event' ? 'entity' : node.kind]) return false
      if (!q) return true
      return node.name.toLowerCase().includes(q) || node.role.toLowerCase().includes(q)
    })
  }, [graph.nodes, kinds, query])

  const ranked = React.useMemo(
    () =>
      [...matching].sort((a, b) => {
        if (a.kind !== b.kind) {
          const order = { entity: 0, claim: 1, source: 2, event: 3 }
          return order[a.kind] - order[b.kind]
        }
        return b.mentionCount - a.mentionCount
      }),
    [matching],
  )

  const hiddenCount = Math.max(0, ranked.length - INITIAL_NODE_CAP)

  const visibleIds = React.useMemo(() => {
    const base = showAll ? ranked : ranked.slice(0, INITIAL_NODE_CAP)
    const set = new Set(base.map((node) => node.id))
    for (const id of expandedIds) {
      for (const neighbour of neighbours.get(id) ?? []) set.add(neighbour)
    }
    return set
  }, [ranked, showAll, expandedIds, neighbours])

  const visibleNodes = React.useMemo(
    () => graph.nodes.filter((node) => visibleIds.has(node.id)),
    [graph.nodes, visibleIds],
  )

  const visibleEdges = React.useMemo(
    () => graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    [graph.edges, visibleIds],
  )

  /* ------------------------------------------------------------ react flow */
  const flowNodes = React.useMemo<FlowNode[]>(
    () =>
      visibleNodes.map((node) => ({
        id: node.id,
        type: node.kind === 'claim' ? 'claim' : node.kind === 'source' ? 'source' : 'entity',
        position: positions[node.id] ?? layout.get(node.id) ?? { x: 0, y: 0 },
        selected: node.id === selectedId,
        data: {
          label: node.name,
          kind: node.kind === 'event' ? 'entity' : node.kind,
          entityType: node.type,
          typeLabel:
            node.kind === 'claim'
              ? 'Claim'
              : node.kind === 'source'
                ? `Record · ${node.role}`
                : (ENTITY_TYPE_LABELS[node.type as EntityType] ?? 'Entity'),
          status: node.status,
        },
      })),
    [visibleNodes, positions, layout, selectedId],
  )

  const flowEdges = React.useMemo<Edge[]>(
    () =>
      visibleEdges.map((edge) => {
        const colour = edgeColour(edge.type)
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: hoveredEdge === edge.id ? edge.description || RELATIONSHIP_TYPE_LABELS[edge.type] : undefined,
          labelBgStyle: { fill: '#FFFFFF' },
          labelStyle: { fontSize: 11, fill: '#111111' },
          style: {
            stroke: colour,
            strokeWidth: edge.type === 'supports' || edge.type === 'contradicts' ? 1.5 : 1,
            strokeDasharray: edge.type === 'contradicts' ? '6 4' : undefined,
          },
        }
      }),
    [visibleEdges, hoveredEdge],
  )

  /**
   * Nodes are fully controlled: their positions live in `positions` so dragged
   * layout survives filtering, expansion and export without a syncing effect.
   */
  const onNodesChange = React.useCallback((changes: NodeChange<FlowNode>[]) => {
    setPositions((current) => {
      let next = current
      for (const change of changes) {
        if (change.type !== 'position' || !change.position) continue
        if (next === current) next = { ...current }
        next[change.id] = change.position
      }
      return next
    })
  }, [])

  const flowRef = React.useRef<{ fitView: () => void } | null>(null)

  const selected = selectedId ? nodeById.get(selectedId) : null
  const selectedNeighbours = selectedId
    ? Array.from(neighbours.get(selectedId) ?? [])
        .map((id) => nodeById.get(id))
        .filter((node): node is GraphView['nodes'][number] => Boolean(node))
    : []
  const isExpanded = selectedId ? expandedIds.includes(selectedId) : false

  /* -------------------------------------------------------------- export */
  async function download(format: 'png' | 'svg') {
    const exportNodes = visibleNodes.map((node) => {
      const point = positions[node.id] ?? layout.get(node.id) ?? { x: 0, y: 0 }
      return {
        id: node.id,
        label: node.name,
        typeLabel:
          node.kind === 'claim' ? 'Claim' : node.kind === 'source' ? 'Record' : ENTITY_TYPE_LABELS[node.type as EntityType] ?? 'Entity',
        x: point.x,
        y: point.y,
      }
    })
    if (exportNodes.length === 0) {
      toast.error('There is nothing on the canvas to export.')
      return
    }

    const svg = buildSvg(exportNodes, visibleEdges)

    function save(blob: Blob, extension: string) {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `evidence-graph.${extension}`
      anchor.click()
      URL.revokeObjectURL(url)
    }

    if (format === 'svg') {
      save(new Blob([svg], { type: 'image/svg+xml' }), 'svg')
      toast.success('Evidence graph exported as SVG.')
      return
    }

    const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image()
        element.onload = () => resolve(element)
        element.onerror = () => reject(new Error('render failed'))
        element.src = source
      })
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = image.width * scale
      canvas.height = image.height * scale
      const context = canvas.getContext('2d')
      if (!context) throw new Error('no canvas context')
      context.scale(scale, scale)
      context.drawImage(image, 0, 0)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('encode failed')
      save(blob, 'png')
      toast.success('Evidence graph exported as PNG.')
    } catch {
      save(new Blob([svg], { type: 'image/svg+xml' }), 'svg')
      toast.success('PNG rendering is unavailable in this browser — exported as SVG instead.')
    }
  }

  if (graph.nodes.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="panel">
          <EmptyState
            title="Nothing to graph yet"
            description="The evidence graph is drawn from entities, records and claims. Add records and build the case map to populate it."
          />
        </div>
      </div>
    )
  }

  /* -------------------------------------------------------------- toolbar */
  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-canvas px-3 py-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search the graph"
        aria-label="Search nodes"
        className="h-8 w-[200px] text-[13px]"
      />

      <div className="flex gap-1" role="group" aria-label="Filter node types">
        {KIND_FILTERS.map((filter) => (
          <button
            key={filter.kind}
            type="button"
            aria-pressed={kinds[filter.kind]}
            onClick={() =>
              setKinds((current) => ({ ...current, [filter.kind]: !current[filter.kind] }))
            }
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors duration-200 ease-editorial',
              kinds[filter.kind]
                ? 'border-evidence-border bg-evidence-soft text-evidence-deep'
                : 'border-line bg-canvas text-ink-muted',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={() => flowRef.current?.fitView()} disabled={listView}>
        <Maximize2 />
        Fit view
      </Button>

      <Button variant="ghost" size="sm" onClick={() => void download('png')}>
        <Download />
        Download PNG
      </Button>

      <Button
        variant={listView ? 'evidence' : 'secondary'}
        size="sm"
        className="ml-auto"
        aria-pressed={listView}
        onClick={() => setListViewChoice(!listView)}
      >
        List view
      </Button>
    </div>
  )

  /* ------------------------------------------------------------ list view */
  if (listView) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="overflow-hidden rounded-panel border border-line bg-canvas">
          {toolbar}
          <div className="p-4">
            <h2 className="text-[13px] font-medium text-ink">Nodes</h2>
            <Table containerClassName="mt-2">
              <caption className="sr-only">
                Every node in the evidence graph with its type, role and mention count
              </caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead numeric>Mentions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleNodes.map((node) => (
                  <TableRow key={node.id}>
                    <TableCell>
                      <span className="block max-w-[46ch] text-[13px] text-ink">{node.name}</span>
                      {node.status ? (
                        <span className="mt-1 inline-block">
                          <ClaimStatusChip status={node.status} size="sm" short />
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="capitalize">{node.kind}</TableCell>
                    <TableCell>
                      {ENTITY_TYPE_LABELS[node.type as EntityType] ?? node.type}
                    </TableCell>
                    <TableCell>{node.role || '—'}</TableCell>
                    <TableCell numeric>{node.mentionCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <h2 className="mt-8 text-[13px] font-medium text-ink">Relationships</h2>
            <Table containerClassName="mt-2">
              <caption className="sr-only">
                Every relationship in the evidence graph, with the description recorded for it
              </caption>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEdges.map((edge) => (
                  <TableRow key={edge.id}>
                    <TableCell>{nodeById.get(edge.source)?.name ?? edge.source}</TableCell>
                    <TableCell>{RELATIONSHIP_TYPE_LABELS[edge.type] ?? edge.type}</TableCell>
                    <TableCell>{nodeById.get(edge.target)?.name ?? edge.target}</TableCell>
                    <TableCell>
                      <span className="block max-w-[52ch] text-[13px] text-ink-secondary">
                        {edge.description || '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {hiddenCount > 0 && !showAll ? (
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => setShowAll(true)}>
                Show {hiddenCount} more
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------- canvas view */
  return (
    <div className="flex h-full min-h-0 flex-col">
      {toolbar}

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative h-[60vh] min-h-[380px] w-full lg:h-auto lg:min-h-0 lg:flex-1">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onInit={(instance) => {
              flowRef.current = instance
              instance.fitView({ padding: 0.12 })
            }}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onNodeDragStop={(_, node) =>
              setPositions((current) => ({ ...current, [node.id]: node.position }))
            }
            onEdgeMouseEnter={(_, edge) => setHoveredEdge(edge.id)}
            onEdgeMouseLeave={() => setHoveredEdge(null)}
            onPaneClick={() => setSelectedId(null)}
            proOptions={{ hideAttribution: true }}
            nodesConnectable={false}
            edgesFocusable={false}
            minZoom={0.2}
            maxZoom={2}
            className="bg-page"
          >
            <Background color="#DFDFD9" gap={28} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              style={{ width: 148, height: 100 }}
              className="hidden sm:block"
              nodeColor={(node) =>
                (node.data as NodeData).kind === 'claim'
                  ? '#3F76C5'
                  : (node.data as NodeData).kind === 'source'
                    ? '#92928C'
                    : '#111111'
              }
              maskColor="rgba(245,245,242,0.75)"
            />
          </ReactFlow>

          {hiddenCount > 0 && !showAll ? (
            <div className="absolute bottom-3 left-3 z-10">
              <Button variant="secondary" size="sm" onClick={() => setShowAll(true)}>
                Show {hiddenCount} more
              </Button>
            </div>
          ) : null}

          <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-panel border border-line bg-canvas/95 px-3 py-2 text-[11px] text-ink-secondary">
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-px w-5" style={{ backgroundColor: EDGE_COLOURS.supports }} />
              supports
            </p>
            <p className="mt-1 flex items-center gap-1.5">
              <span
                className="inline-block h-px w-5"
                style={{
                  backgroundImage: `repeating-linear-gradient(to right, ${EDGE_COLOURS.contradicts} 0 4px, transparent 4px 7px)`,
                  height: '1px',
                }}
              />
              contradicts
            </p>
            <p className="mt-1 flex items-center gap-1.5">
              <span className="inline-block h-px w-5" style={{ backgroundColor: EDGE_COLOURS.other }} />
              other relationship
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------- node detail */}
        {selected ? (
          <aside className="w-full shrink-0 border-t border-line bg-canvas px-4 py-4 lg:w-[320px] lg:border-l lg:border-t-0">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-[13px] font-medium leading-snug text-ink">{selected.name}</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                Close
              </Button>
            </div>

            <dl className="mt-3 space-y-2 text-[13px]">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-muted">Type</dt>
                <dd className="text-ink">
                  {selected.kind === 'claim'
                    ? 'Claim'
                    : selected.kind === 'source'
                      ? 'Record'
                      : (ENTITY_TYPE_LABELS[selected.type as EntityType] ?? selected.type)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-muted">Role</dt>
                <dd className="text-ink">{selected.role || 'Not recorded'}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-muted">Description</dt>
                <dd className="leading-relaxed text-ink-secondary">
                  {selected.description || 'No description recorded.'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-muted">Mentions</dt>
                <dd className="tabular text-ink">{selected.mentionCount}</dd>
              </div>
            </dl>

            {selected.kind === 'source' ? (
              <Link
                href={`/app/cases/${caseId}/sources/${selected.id.replace('source:', '')}`}
                className="mt-3 inline-block text-[13px] text-evidence-deep hover:underline"
              >
                Open this record
              </Link>
            ) : null}
            {selected.kind === 'claim' ? (
              <Link
                href={`/app/cases/${caseId}/claims?claim=${selected.id.replace('claim:', '')}`}
                className="mt-3 inline-block text-[13px] text-evidence-deep hover:underline"
              >
                Open this claim
              </Link>
            ) : null}

            <div className="mt-4 border-t border-line pt-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11px] uppercase tracking-wide text-ink-muted">
                  Connected ({selectedNeighbours.length})
                </h3>
                {selectedNeighbours.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedIds((current) =>
                        current.includes(selected.id)
                          ? current.filter((id) => id !== selected.id)
                          : [...current, selected.id],
                      )
                    }
                  >
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </Button>
                ) : null}
              </div>
              <ul className="mt-2 space-y-1">
                {selectedNeighbours.map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(node.id)}
                      className="w-full truncate rounded-control px-2 py-1 text-left text-[13px] text-ink-secondary hover:bg-surface hover:text-ink"
                    >
                      {node.name}
                    </button>
                  </li>
                ))}
                {selectedNeighbours.length === 0 ? (
                  <li className="px-2 py-1 text-[13px] text-ink-muted">
                    Nothing in the case connects to this node yet.
                  </li>
                ) : null}
              </ul>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
